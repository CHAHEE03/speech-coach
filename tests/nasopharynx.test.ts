/**
 * The side view's nasopharynx, on the engine's own frames: the air space runs from the throat's back
 * wall, behind the soft palate, up to the back of the nasal cavity, and starts at the soft palate's
 * tip, so lowering the soft palate (a nasal) moves its lower edge down with the tip.
 */
import { describe, expect, test } from "bun:test";
import { initEngine } from "./harness.ts";

await initEngine();
const { NEUTRAL, restTip } = await import("../src/wasm/engine.ts");
const { VoiceModel } = await import("../src/ui/analysis.ts");
const { buildProfile } = await import("../src/ui/render/profile.ts");
const { nasopharynx } = await import("../src/ui/render/illustration.ts");

const model = new VoiceModel({ female: 0, child: 0 }, 48000);
const tip = restTip(NEUTRAL.jaw, NEUTRAL.tbX, NEUTRAL.tbY);
const at = (velum: number) => {
  const a = { ...NEUTRAL, ttX: tip.x, ttY: tip.y, velum };
  const f = model.frame(a);
  return { f, G: buildProfile(model, f, a), n: nasopharynx(buildProfile(model, f, a), f)! };
};
const rearmost = (pts: { x: number; y: number }[]) => pts.reduce((b, p) => (p.x < b.x ? p : b));

describe("nasopharynx", () => {
  test("it reaches from the soft palate's tip up to the back of the nasal cavity", () => {
    const { f, G, n } = at(NEUTRAL.velum);
    expect(n).not.toBeNull();
    const t = rearmost(f.velum);
    expect(n.space.some((p) => p.x === t.x && p.y === t.y)).toBe(true);
    const backTop = Math.max(...G.nasal.filter((p) => p.x < rearmost(G.nasal).x + 0.7).map((p) => p.y));
    expect(Math.max(...n.space.map((p) => p.y))).toBeGreaterThanOrEqual(backTop - 0.01);
  });

  test("its back wall starts on the throat's back wall, below the soft palate's tip", () => {
    const { f, n } = at(NEUTRAL.velum);
    expect(n.wall[0].y).toBeLessThan(rearmost(f.velum).y);
    expect(n.wall[0].x).toBeLessThan(0);
  });

  test("lowering the soft palate (a nasal) lowers its tip and the space's floor with it", () => {
    const raised = at(-0.15), lowered = at(1.1);
    expect(lowered.f.velumPort).toBeGreaterThan(raised.f.velumPort);
    expect(rearmost(lowered.f.velum).y).toBeLessThan(rearmost(raised.f.velum).y);
    expect(Math.min(...lowered.n.space.map((p) => p.y))).toBeLessThanOrEqual(Math.min(...raised.n.space.map((p) => p.y)) + 0.01);
  });
});
