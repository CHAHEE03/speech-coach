/**
 * Korean for Speak: Hangul through the engine's Korean front end, joined into spoken phrases that
 * the planner accepts.
 */
import { describe, expect, test } from "bun:test";
import { initEngine } from "./harness.ts";

await initEngine();
const { koreanPhrases } = await import("../src/ui/korean.ts");
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
