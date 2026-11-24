/**
 * Korean for Speak: Hangul through the engine's Korean front end, joined into spoken phrases that
 * the planner accepts.
 */
import { describe, expect, test } from "bun:test";
import { initEngine } from "./harness.ts";

await initEngine();
const { koreanPhrases, between, REFERENCE } = await import("../src/ui/korean.ts");
const { existsSync } = await import("node:fs");
const { planPhrases } = await import("../src/wasm/engine.ts");
const male = { female: 0, child: 0 };

describe("koreanPhrases", () => {
  test("one phrase per sentence, a question rises", () => {
    const p = koreanPhrases("안녕하세요. 밥 먹었어요?");
    expect(p.length).toBe(2);
    expect(p[0].intonation).toBe("statement");
    expect(p[1].intonation).toBe("question");
    expect(p[1].words).toEqual(["밥", "먹었어요"]);
  });

  test("every word ends on a segment marked wordEnd", () => {
    const p = koreanPhrases("밥 먹었어요");
    expect(p[0].segments.filter((s) => s.wordEnd).length).toBe(2);
    expect(p[0].segments.at(-1)?.wordEnd).toBe(true);
  });

  test("the planner turns it into gestures", () => {
    const plan = planPhrases(koreanPhrases("아이 우유"), { body: male, t0: 0, rate: 1, f0: 110 });
    expect(plan.gestures.length).toBeGreaterThan(0);
    expect(plan.end).toBeGreaterThan(0.3);
  });

  test("no Hangul, no phrases", () => {
    expect(koreanPhrases("   ")).toEqual([]);
  });
});

describe("between: the consonant chart's words", () => {
  test("a consonant starts the second syllable", () => {
    expect(between("ㅂ", "ㅏ")).toBe("아바");
    expect(between("ㄲ", "ㅣ")).toBe("이끼");
    expect(between("ㅎ", "ㅜ")).toBe("우후");
    expect(between("ㅊ", "ㅡ")).toBe("으츠");
  });

  test("ㅇ only sounds at a syllable's end", () => {
    expect(between("ㅇ", "ㅏ")).toBe("앙아");
  });

  test("each one is speakable", () => {
    for (const c of "ㄱㄲㅋㄷㄸㅌㅂㅃㅍㅈㅉㅊㅅㅆㅎㅁㄴㅇㄹ") expect(koreanPhrases(between(c, "ㅏ"))[0].segments.length).toBeGreaterThanOrEqual(3);
  });

  test("every textbook drawing the chart shows is in public/sagittal", () => {
    for (const file of Object.values(REFERENCE)) expect(existsSync(new URL(`../public/sagittal/${file}.svg`, import.meta.url))).toBe(true);
  });

  test("anything else is refused", () => {
    expect(() => between("b", "ㅏ")).toThrow();
    expect(() => between("ㅂ", "a")).toThrow();
  });
});
