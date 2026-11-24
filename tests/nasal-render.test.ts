import { describe, expect, test } from "bun:test";
import { drawNasalFlow, NasalAirflow, nasalFlowAt } from "../src/ui/render/illustration.ts";
import type { Profile } from "../src/ui/render/profile.ts";
import type { HumanFrame } from "../src/wasm/types.ts";

const uniform = (flow: number) => new Float32Array(12).fill(flow);
const visible = (air: NasalAirflow) => air.particles.filter((p, i) => i / air.particles.length < p.amount);

describe("nasal airflow animation", () => {
  test("distance selects sections from the velum to the nostrils", () => {
    const flow = new Float32Array([20, 60, 120, 160, 200]);
    expect([0, 0.25, 0.5, 0.75, 1].map((s) => nasalFlowAt(flow, s))).toEqual([...flow]);
    expect(nasalFlowAt(flow, -1)).toBe(20);
    expect(nasalFlowAt(flow, 2)).toBe(200);
    expect(nasalFlowAt(undefined, 0.5)).toBe(0);
    expect(nasalFlowAt(new Float32Array(), 0.5)).toBe(0);
    expect(nasalFlowAt(new Float32Array([-100]), 0.5)).toBe(0);
    expect(nasalFlowAt(new Float32Array([NaN]), 0.5)).toBe(0);
  });

  test("a typical nasal has more, stronger, faster streaks than a weak breath", () => {
    const weak = new NasalAirflow(), nasal = new NasalAirflow(), burst = new NasalAirflow();
    weak.update(uniform(20), 0.02, 10);
    nasal.update(uniform(150), 0.02, 10);
    burst.update(uniform(1000), 0.02, 10);
    expect(visible(nasal).length).toBeGreaterThan(visible(weak).length * 4);
    expect(visible(nasal).length).toBeGreaterThan(35);
    expect(nasal.particles[0].amount).toBe(0.75);
    expect(nasal.particles[0].s).toBeGreaterThan(weak.particles[0].s);
    expect(burst.particles.every((p) => p.amount === 1)).toBe(true);
  });

  test("streaks follow local flow and puffs follow only the last section", () => {
    const air = new NasalAirflow();
    air.update(new Float32Array([150, 0]), 0.04, 10);
    expect(visible(air).length).toBeGreaterThan(0);
    expect(visible(air).every((p) => p.s < 0.5)).toBe(true);
    expect(air.puffs).toHaveLength(0);
    air.update(new Float32Array([0, 150]), 0.04, 10);
    expect(visible(air).every((p) => p.s >= 0.5)).toBe(true);
    expect(air.puffs.length).toBeGreaterThan(0);
  });

  test("nostril flow increases puff rate, speed and initial size", () => {
    const weak = new NasalAirflow(), nasal = new NasalAirflow();
    for (let i = 0; i < 10; i++) {
      weak.update(uniform(40), 0.02, 10);
      nasal.update(uniform(150), 0.02, 10);
    }
    expect(nasal.puffs.length).toBeGreaterThan(weak.puffs.length);
    expect(nasal.puffs[0].vx).toBeGreaterThan(weak.puffs[0].vx);
    const initialRadius = (p: typeof nasal.puffs[number]) => p.r - (1 - p.life) / 1.5 * 0.8;
    expect(initialRadius(nasal.puffs[0])).toBeGreaterThan(initialRadius(weak.puffs[0]));
    expect(nasal.puffs[0].x).toBeGreaterThan(0);
    expect(nasal.puffs[0].y).toBeLessThan(0);
  });

  test("closed, residual, inward and missing flow stop streaks and new puffs; old puffs fade out", () => {
    for (const flow of [uniform(0), uniform(5), uniform(-100), new Float32Array(), undefined]) {
      const air = new NasalAirflow();
      air.update(uniform(150), 0.05, 10);
      const out = air.puffs.length;
      expect(out).toBeGreaterThan(0);
      air.update(flow, 0.02, 10);
      expect(visible(air)).toHaveLength(0);
      // none added, the ones out still fading
      expect(air.puffs.length).toBeLessThanOrEqual(out);
      expect(air.puffs.every((p) => p.life < 1)).toBe(true);
      // gone within a second (life falls 1.5 per second)
      for (let i = 0; i < 25; i++) air.update(flow, 0.04, 10);
      expect(air.puffs).toHaveLength(0);
      // no fractional emission carried over: a fresh nasal's first tiny step adds none
      air.update(uniform(150), 0.01, 10);
      expect(air.puffs).toHaveLength(0);
    }
  });

  test("the drawing hides the tag until nostril flow exceeds 30 and draws nothing at rest", () => {
    // Only the geometry and canvas operations used by this overlay are needed.
    const G = { nasal: [{ x: 0, y: 2 }, { x: 2, y: 3 }, { x: 4, y: 2 }], outerWall: [{ x: -1, y: 0 }] } as Profile;
    const f = { velum: [{ x: 0, y: 0 }, { x: 0, y: 1 }] } as HumanFrame;
    let strokes = 0, labels = 0;
    const ctx = {
      save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {},
      stroke() { strokes++; }, strokeText() {}, fillText() { labels++; },
    } as unknown as CanvasRenderingContext2D;
    const air = new NasalAirflow();
    const draw = (flow: Float32Array) => {
      strokes = labels = 0;
      drawNasalFlow(ctx, G, f, (p) => [p.x * 20, -p.y * 20], 20, flow, 0.04, air);
    };
    draw(new Float32Array([150, 30]));
    expect(strokes).toBeGreaterThan(0);
    expect(labels).toBe(0);
    draw(uniform(31));
    expect(labels).toBe(1);
    draw(uniform(0));
    expect(strokes).toBe(0);
    expect(labels).toBe(0);
  });
});
