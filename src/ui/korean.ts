import { lyricsToSyllables, type Phrase, type Segment } from "../wasm/engine.ts";

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
