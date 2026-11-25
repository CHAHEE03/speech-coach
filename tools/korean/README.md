# Korean intelligibility check

How well a Korean speech recogniser understands the engine's Korean. `words.tsv` lists 106 real
words and short phrases in minimal sets (plain / tense / aspirated stops, ?? finals, vowels,
sound-change words, everyday phrases).

```powershell
bun tools/korean/render.ts <out>                                   # 212 WAVs, male + female (~1.5 min)
~\.cache\speech-coach-asr\.venv\Scripts\python.exe -I tools/korean/score.py <out> --against tools/korean/baseline.json   # ~6 min on CPU
```

Setup once: `uv venv --python 3.12 ~/.cache/speech-coach-asr/.venv` and
`uv pip install --python ~/.cache/speech-coach-asr/.venv/Scripts/python.exe faster-whisper==1.2.1`.
The Whisper model (`small`, ~0.5 GB, `Systran/faster-whisper-small`) downloads on first use.

`score.py` splits each Hangul block into initial, vowel and final (`??` is a final ?? and counts
letter errors, so a confusion names the sound (`?룐넂??: a ??heard as ?? `?끸넂??: an extra ??.

## Baseline (2026-11-25, Whisper small, engine at f82a2fe)

`baseline.json` holds the summary. Word accuracy **15.6%**, letter error rate **61.3%** (male
57.2%, female 65.4%). Short phrases do far better (55% exact) than single words: Whisper invents
words for a lone syllable (? ??"Please", 臾???"moon"), so single-word scores are pessimistic, but
the confusions are consistent:

| What goes wrong | Count | Examples (male) |
|---|---|---|
| plain stops heard aspirated | ?룐넂??횞10, ?귘넂??횞8 | ?р넂?瑜? 媛뺚넂?? 怨듈넂肄? 諛β넂??|
| plain ??heard tense | ?끸넂??횞8 | ?쇄넂?? ?먥넂?섎━ |
| a vowel after a final (released finals) | ?끸넂??횞17, ?끸넂??횞18 | 留먥넂留덈Ⅴ, 臾쇄넂臾대쫷, 援닳넂?꾩쓹 |
| ??heard as ??| ?밟넂??횞8 | ?곕━?믪슦?? ?щ엺?믪궗??|
| ??and ??swapped; ??heard ??or ??| ?볛넂??횞10, ?뤴넂??횞9, ?쒋넂??횞7 | 癒몃━?믩쭏由? ?대㉧?댿넂?꾨쭏由?|
| ??????lost | ??| ?먮떎, 吏쒕떎, 李⑤떎 ??鍮낆꺑??|

What the engine lacks for these (docs in CHIMERA): the lower pitch after a plain stop (Seoul
speakers' main cue alongside aspiration), the stiff voice of tense stops, unreleased finals, and
vowel targets measured on Korean speakers.

Whisper is a machine with a language model; it doesn't replace a Korean speaker's ear.

## Other recognisers (`--model`)

- `large-v3-turbo` (~1.6 GB, ~28 min on CPU): the better judge. Baseline engine: word accuracy
  27.8%, letter error rate 52.9% (Whisper small heard the same audio as 15.6% / 61.3%).
- `w2v` (`kresnik/wav2vec2-large-xlsr-korean`, needs torch + transformers, 0.35 s a file): writes
  syllables with no language model. On the engine's audio it drops most syllables (81.8% letters
  wrong, mostly deletions), so it is no judge of the engine; it's here for real speakers' recordings,
  which it was trained on (not checked yet).
