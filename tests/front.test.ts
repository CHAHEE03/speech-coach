/**
 * The front view's mouth from the engine's articulation, on the engine's own vowel targets: ㅣ is
 * wide and barely open, ㅏ open with the teeth apart, ㅜ round and narrow, and closed lips show no
 * opening.
 */
import { describe, expect, test } from "bun:test";
import { frontShape } from "../src/ui/front.ts";

// lip and jaw values of the engine's male vowel targets (VOWEL_TARGETS)
const i = { jaw: 0.41, lipAp: 1.05, lipProt: 0, lipWidth: 1, ttY: 7.29 };
const a = { jaw: 1.65, lipAp: 2.0, lipProt: 0, lipWidth: 1, ttY: 5.49 };
const u = { jaw: 0.2, lipAp: 0.29, lipProt: 1.4, lipWidth: 0.07, ttY: 6.5 };

describe("frontShape", () => {
  test("spread lips are wider than round ones", () => {
    expect(frontShape(i).lipsW).toBeGreaterThan(frontShape(u).lipsW + 1.5);
  });

  test("the gap between the teeth is the jaw's opening", () => {
    const s = frontShape(a);
    expect(s.upperTeeth - s.lowerTeeth).toBeCloseTo(1.65, 5);
    expect(frontShape(i).upperTeeth - frontShape(i).lowerTeeth).toBeLessThan(s.upperTeeth - s.lowerTeeth);
  });

  test("ㅏ opens wider than ㅣ, which opens wider than ㅜ", () => {
    expect(frontShape(a).open).toBeGreaterThan(frontShape(i).open);
    expect(frontShape(i).open).toBeGreaterThan(frontShape(u).open);
  });

  test("a rounded opening is about as wide as it is tall; a spread one is a wide slit", () => {
    const su = frontShape(u), si = frontShape(i);
    expect(su.openW / su.open).toBeLessThan(5);
    expect(si.openW / si.open).toBeGreaterThan(3);
  });

  test("closed lips have no opening", () => {
    const s = frontShape({ ...i, lipAp: -0.2 });
    expect(s.open).toBe(0);
    expect(s.openW).toBe(0);
  });

  test("a raised tongue tip reaches the upper teeth", () => {
    const low = frontShape({ ...a, ttY: 5 }), high = frontShape({ ...a, ttY: 10.5 });
    expect(high.tongueTop).toBeGreaterThan(low.tongueTop);
    expect(high.tongueTop).toBeGreaterThanOrEqual(high.upperTeeth);
  });
});
