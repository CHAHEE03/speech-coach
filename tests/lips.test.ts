/**
 * The front view's lip outlines (lipShapes) on the engine's vowel targets: a cupid's bow on the
 * upper lip, corners that meet at points, an opening inside the lips that is a pointed lens when
 * spread (ㅣ) and close to a circle when rounded (ㅜ), and no opening when the lips touch.
 */
import { describe, expect, test } from "bun:test";
import { frontShape, lipShapes, type P2 } from "../src/ui/front.ts";

const i = frontShape({ jaw: 0.41, lipAp: 1.05, lipProt: 0, lipWidth: 1, ttY: 7.29 });
const a = frontShape({ jaw: 1.65, lipAp: 2.0, lipProt: 0, lipWidth: 1, ttY: 5.49 });
const u = frontShape({ jaw: 0.2, lipAp: 0.29, lipProt: 1.4, lipWidth: 0.07, ttY: 6.5 });
const closed = frontShape({ jaw: 0.3, lipAp: -0.2, lipProt: 0.1, lipWidth: 0.6, ttY: 6.5 });

const xs = (p: P2[]) => p.map((q) => q[0]), ys = (p: P2[]) => p.map((q) => q[1]);
const width = (p: P2[]) => Math.max(...xs(p)) - Math.min(...xs(p));
const height = (p: P2[]) => Math.max(...ys(p)) - Math.min(...ys(p));
/** the upper edge's height at x (the outline's highest point near x) */
const upperAt = (p: P2[], x: number) => Math.max(...p.filter((q) => Math.abs(q[0] - x) < 0.06).map((q) => q[1]));

describe("lipShapes", () => {
  test("the lips span corner to corner, as wide as frontShape says", () => {
    for (const s of [i, a, u]) expect(width(lipShapes(s).outer)).toBeCloseTo(s.lipsW, 5);
  });

  test("the upper lip has a cupid's bow: a dip between two peaks", () => {
    const L = lipShapes(i);
    const peak = upperAt(L.outer, 0.4), middle = upperAt(L.outer, 0);
    expect(peak - middle).toBeGreaterThan(0.08);
  });

  test("pushed-out lips have a flatter bow and fuller lips", () => {
    const spreadBow = upperAt(lipShapes(i).outer, 0.4) - upperAt(lipShapes(i).outer, 0);
    const roundBow = upperAt(lipShapes(u).outer, 0.4) - upperAt(lipShapes(u).outer, 0);
    expect(roundBow).toBeLessThan(spreadBow);
    expect(lipShapes(u).topU - lipShapes(u).botL - u.open).toBeGreaterThan(lipShapes(i).topU - lipShapes(i).botL - i.open);
  });

  test("the opening sits inside the lips, as wide and tall as frontShape says", () => {
    for (const s of [i, a, u]) {
      const L = lipShapes(s);
      expect(L.opening).not.toBeNull();
      expect(width(L.opening!)).toBeCloseTo(s.openW, 5);
      expect(height(L.opening!)).toBeCloseTo(s.open, 1);
      expect(Math.max(...ys(L.opening!))).toBeLessThan(L.topU);
      expect(Math.min(...ys(L.opening!))).toBeGreaterThan(L.botL);
    }
  });

  test("spread lips open as a wide lens, rounded ones close to a circle", () => {
    const lens = lipShapes(i).opening!, round = lipShapes(u).opening!;
    expect(width(lens) / height(lens)).toBeGreaterThan(3);
    expect(width(round) / height(round)).toBeLessThan(5);
    // a lens's corners are pointed: near the corner the opening is much thinner than a rounded one's
    const thinness = (p: P2[], s: typeof i) => height(p.filter((q) => Math.abs(q[0]) > 0.8 * (s.openW / 2))) / s.open;
    expect(thinness(lens, i)).toBeLessThan(thinness(round, u));
  });

  test("closed lips have no opening", () => {
    expect(lipShapes(closed).opening).toBeNull();
  });
});
