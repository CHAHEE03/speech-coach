/**
 * The drawing's neck outline (drawingNeck) on the engine's own profile: it starts at the bottom of
 * the frame, bulges over the thyroid cartilage (more for a male body than a female), and from the
 * neck-chin angle on is the engine's outline exactly, so the chin still moves with the jaw.
 */
import { describe, expect, test } from "bun:test";
import { initEngine } from "./harness.ts";

await initEngine();
const { NEUTRAL, restTip } = await import("../src/wasm/engine.ts");
const { VoiceModel } = await import("../src/ui/analysis.ts");
const { buildProfile } = await import("../src/ui/render/profile.ts");
const { drawingNeck } = await import("../src/ui/render/illustration.ts");

const profile = (body: { female: number; child: number }, jaw = NEUTRAL.jaw) => {
  const m = new VoiceModel(body, 48000);
  const tip = restTip(jaw, NEUTRAL.tbX, NEUTRAL.tbY);
  const a = { ...NEUTRAL, jaw, ttX: tip.x, ttY: tip.y };
  return buildProfile(m, m.frame(a), a);
};
const male = { female: 0, child: 0 }, female = { female: 1, child: 0 };
/** how far the outline stands forward of the thyroid cartilage's prominence, just below its top (where the bulge sits) */
const appleOut = (G: ReturnType<typeof profile>) => {
  const prom = G.thyroid.reduce((b, p) => (p.x > b.x ? p : b));
  const near = drawingNeck(G).filter((p) => p.y > prom.y - 0.6 && p.y < prom.y + 0.1);
  return Math.max(...near.map((p) => p.x)) - prom.x;
};

describe("drawingNeck", () => {
  test("starts at the bottom of the frame and ends with the engine's chin and lower lip", () => {
    const G = profile(male);
    const neck = drawingNeck(G);
    expect(neck[0].y).toBeCloseTo(G.skinLower[0].y, 5);
    const tail = G.skinLower.slice(-8);
    expect(neck.slice(-8)).toEqual(tail);
  });

  test("an Adam's apple: the outline stands out over the thyroid cartilage, more for a male body", () => {
    // male ~0.80 cm, female ~0.63 (her outline just rises smoothly toward the chin)
    expect(appleOut(profile(male))).toBeGreaterThan(0.7);
    expect(appleOut(profile(male))).toBeGreaterThan(appleOut(profile(female)) + 0.12);
  });

  test("the chin still moves with the jaw", () => {
    const closed = drawingNeck(profile(male, 0.6)), open = drawingNeck(profile(male, 1.65));
    const chinY = (n: { x: number; y: number }[]) => Math.min(...n.filter((p) => p.x > 4.5).map((p) => p.y));
    expect(chinY(open)).toBeLessThan(chinY(closed) - 0.3);
  });
});
