"""How well a Korean listener-machine understands the engine's Korean: transcribe render.ts's WAVs
with faster-whisper (multilingual, Korean forced, greedy-equivalent beam, so the same audio gives
the same text) and compare with the intended word letter by letter: each Hangul block split into
its initial, vowel and final (ㄱ, ㅏ, final ㄴ written ㄴ_), so an error names the sound.

usage: python tools/korean/score.py <out> [--model small|large-v3-turbo|w2v] [--against earlier/score.json]

Writes <out>/score.json (score-<model>.json for a model other than small): every item (the word, what was heard, its letter errors) and the summary:
word accuracy and letter error rate (per kind of word and per voice) and the commonest confusions.
With --against it prints how the letter error rate moved.

Setup (once): uv venv --python 3.12 ~/.cache/speech-coach-asr/.venv, then
uv pip install faster-whisper==1.2.1 into it; the model downloads on first use (small ~0.5 GB).
Whisper leans toward real words and guesses from context, so this is a lower bound on errors a
person would hear, not a person: it doesn't replace a Korean speaker's ear.
"""

import json
import os
import sys
import wave
from collections import Counter

import numpy as np

BASE = 0xAC00
L = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
V = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"
T = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"]


def load16k(path):
    """Mono float32 at 16 kHz from a 16-bit PCM WAV (band-limited FFT resampling, as CHIMERA's
    tools/asr does). Read here rather than by faster-whisper: its decoder (PyAV) rejects a keyword
    the installed PyAV dropped."""
    with wave.open(path) as w:
        ch, rate = w.getnchannels(), w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768.0
    x = x.reshape(-1, ch).mean(axis=1)
    n = int(round(len(x) * 16000 / rate))
    return (np.fft.irfft(np.fft.rfft(x)[: n // 2 + 1], n) * (n / len(x))).astype(np.float32)


W2V = "kresnik/wav2vec2-large-xlsr-korean"


def recogniser(name):
    """16 kHz audio → text. "w2v": a Korean wav2vec2 that writes the syllables it hears (CTC, greedy,
    no language model), so it doesn't round a sound off to a likely word the way Whisper does;
    needs torch and transformers. Anything else: a faster-whisper model."""
    if name == "w2v":
        import torch
        from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

        proc, net = Wav2Vec2Processor.from_pretrained(W2V), Wav2Vec2ForCTC.from_pretrained(W2V).eval()

        def hear(x):
            with torch.inference_mode():
                logits = net(proc(x, sampling_rate=16000, return_tensors="pt").input_values).logits
            return proc.batch_decode(logits.argmax(-1))[0].strip()

        return hear
    from faster_whisper import WhisperModel

    model = WhisperModel(name, device="cpu", compute_type="int8")

    def hear(x):
        segs, _ = model.transcribe(x, language="ko", beam_size=5, temperature=0.0, condition_on_previous_text=False, without_timestamps=True)
        return "".join(s.text for s in segs).strip()

    return hear


def hangul(text):
    """Only the Hangul blocks (spaces, punctuation, digits and Latin dropped)."""
    return "".join(c for c in text if 0xAC00 <= ord(c) <= 0xD7A3)


def letters(text):
    """Blocks → letters: initial (silent ㅇ kept, as it is spelt), vowel, final marked with _."""
    out = []
    for c in hangul(text):
        i = ord(c) - BASE
        out.append(L[i // 588])
        out.append(V[(i % 588) // 28])
        if i % 28:
            out.append(T[i % 28] + "_")
    return out


def align(ref, hyp):
    """Edit distance and the edits (substitution a→b, deletion a→'', insertion ''→b)."""
    n, m = len(ref), len(hyp)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]))
    edits, i, j = [], n, m
    while i or j:
        if i and j and d[i][j] == d[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]):
            if ref[i - 1] != hyp[j - 1]:
                edits.append((ref[i - 1], hyp[j - 1]))
            i, j = i - 1, j - 1
        elif i and d[i][j] == d[i - 1][j] + 1:
            edits.append((ref[i - 1], ""))
            i -= 1
        else:
            edits.append(("", hyp[j - 1]))
            j -= 1
    return d[n][m], edits[::-1]


def main():
    # Windows consoles default to a legacy code page (cp949); the summary prints Hangul and ∅
    sys.stdout.reconfigure(encoding="utf-8")
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    out = args[0]
    model_name = args[args.index("--model") + 1] if "--model" in args else "small"
    against = args[args.index("--against") + 1] if "--against" in args else None
    manifest = json.load(open(os.path.join(out, "manifest.json"), encoding="utf-8"))
    hear = recogniser(model_name)

    items = []
    for k, it in enumerate(manifest):
        heard = hear(load16k(os.path.join(out, it["file"])))
        ref, hyp = letters(it["text"]), letters(heard)
        dist, edits = align(ref, hyp)
        items.append({**it, "heard": heard, "exact": hangul(heard) == hangul(it["text"]), "letters": len(ref), "errors": dist, "edits": edits})
        print(f"\r{k + 1}/{len(manifest)}", end="", file=sys.stderr, flush=True)
    print(file=sys.stderr)

    def summary(rows):
        n = sum(r["letters"] for r in rows)
        return {"words": len(rows), "word_accuracy": round(100 * sum(r["exact"] for r in rows) / max(1, len(rows)), 1), "letter_error_rate": round(100 * sum(r["errors"] for r in rows) / max(1, n), 1)}

    kinds = sorted({r["kind"] for r in items})
    bodies = sorted({r["body"] for r in items})
    confusions = Counter(f"{a or '∅'}→{b or '∅'}" for r in items for a, b in r["edits"])
    result = {
        "model": model_name,
        "all": summary(items),
        "by_body": {b: summary([r for r in items if r["body"] == b]) for b in bodies},
        "by_kind": {k: summary([r for r in items if r["kind"] == k]) for k in kinds},
        "confusions": confusions.most_common(25),
        "items": items,
    }
    # one file per recogniser, so a Whisper and a wav2vec2 score of the same renders sit side by side
    json.dump(result, open(os.path.join(out, "score.json" if model_name == "small" else f"score-{model_name.replace('/', '_')}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    a = result["all"]
    print(f"model {model_name}: {a['words']} renders, word accuracy {a['word_accuracy']}%, letter error rate {a['letter_error_rate']}%")
    for b, s in result["by_body"].items():
        print(f"  {b:7} word {s['word_accuracy']:5}%  letters wrong {s['letter_error_rate']:5}%")
    for k, s in result["by_kind"].items():
        print(f"  {k:7} word {s['word_accuracy']:5}%  letters wrong {s['letter_error_rate']:5}%  ({s['words']})")
    print("  commonest confusions (intended→heard, ∅ = missing/extra, _ = final):")
    print("   " + "  ".join(f"{c} ×{n}" for c, n in result["confusions"][:15]))
    if against:
        old = json.load(open(against, encoding="utf-8"))["all"]["letter_error_rate"]
        print(f"  letter error rate {old}% → {a['letter_error_rate']}% ({a['letter_error_rate'] - old:+.1f})")


if __name__ == "__main__":
    main()
