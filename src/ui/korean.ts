import { lyricsToSyllables, type Phrase, type Segment } from "../wasm/engine.ts";

/** Hangul's initial consonants and medial vowels in Unicode order (a syllable's code is built from their indexes). */
const ONSETS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const MEDIALS = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const NG_CODA = 21;
const syllable = (onset: number, medial: number, coda = 0) => String.fromCharCode(0xac00 + (onset * 21 + medial) * 28 + coda);

/**
 * The textbook drawing (public/sagittal, Wright & McCloy, CC0) whose tongue and lips match each
 * consonant's closure. ㅈㅉㅊ, ㅎ and ㄹ have none in that set.
 */
export const REFERENCE: Record<string, string> = {
  ㅂ: "p", ㅃ: "p", ㅍ: "p",
  ㄷ: "t", ㄸ: "t", ㅌ: "t",
  ㄱ: "k", ㄲ: "k", ㅋ: "k",
  ㅁ: "m", ㄴ: "n", ㅇ: "ng",
  ㅅ: "s", ㅆ: "s",
};

/** A consonant said between two vowels, as Hangul: ㅂ with ㅏ is 아바. ㅇ sounds only at the end of a syllable, so it is 앙아. */
export function between(consonant: string, vowel: string): string {
  const c = ONSETS.indexOf(consonant), v = MEDIALS.indexOf(vowel);
  if (c < 0 || v < 0 || consonant.length !== 1 || vowel.length !== 1) throw new Error(`not a Hangul consonant and vowel: ${consonant} ${vowel}`);
  const silent = ONSETS.indexOf("ㅇ");
  return consonant === "ㅇ" ? syllable(silent, v, NG_CODA) + syllable(silent, v) : syllable(silent, v) + syllable(c, v);
}

/**
 * Korean text → phrases for Speak, one per sentence. The engine reads Hangul only as sung
 * syllables (its Korean front end, with Korean sound rules and aspiration); their segments,
 * joined, are the speech.
 * shortcut: no Korean pitch accent or phrase-final lengthening, only statement/question
 * intonation; add a spoken Korean front end in the engine if it sounds sung.
 */
export function koreanPhrases(text: string): Phrase[] {
  const out: Phrase[] = [];
  for (const sentence of text.split(/(?<=[.?!])\s+/)) {
    const segments: Segment[] = [];
    const words: string[] = [];
    let word = "";
    for (const s of lyricsToSyllables(sentence)) {
      const seg = [...s.onset, s.nucleus, ...s.coda];
      word += s.text;
      if (s.wordEnd) {
        seg[seg.length - 1] = { ...seg[seg.length - 1], wordEnd: true };
        words.push(word);
        word = "";
      }
      segments.push(...seg);
    }
    if (word) words.push(word);
    if (segments.length) out.push({ segments, intonation: sentence.trim().endsWith("?") ? "question" : "statement", pause: 0.35, words });
  }
  return out;
}
