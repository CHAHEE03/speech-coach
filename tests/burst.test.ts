/**
 * Air shown only when it bursts: the envelope stays near zero for a steady flow and lights for a
 * sudden rise, then fades. Flows are the engine's own (tests/airflow.test.ts): a held vowel ~130 at
 * the lips, an aspirated release ~900, a nasal ~130 at the nostrils.
 */
import { describe, expect, test } from "bun:test";
import { BurstEnvelope } from "../src/ui/burst.ts";

const DT = 1 / 60;
const run = (env: BurstEnvelope, flow: number, seconds: number) => {
  let last = 0;
  for (let t = 0; t < seconds; t += DT) last = env.update(flow, DT);
  return last;
};

describe("BurstEnvelope", () => {
  test("a held vowel's steady flow fades from view", () => {
    const env = new BurstEnvelope(500);
    run(env, 130, 0.5);
    expect(env.update(130, DT)).toBeLessThan(0.02);
  });

  test("an aspirated release lights it, then it fades within half a second", () => {
    const env = new BurstEnvelope(500);
    run(env, 130, 0.5);
    expect(env.update(900, DT)).toBeGreaterThan(0.9);
    expect(run(env, 900, 0.5)).toBeLessThan(0.1);
  });

  test("a small rise (a plain stop's release ~90) stays faint", () => {
    const env = new BurstEnvelope(500);
    run(env, 0, 0.3);
    expect(env.update(90, DT)).toBeLessThan(0.2);
  });

  test("a nasal's start shows at the nostrils, its hold does not", () => {
    const env = new BurstEnvelope(100);
    run(env, 0, 0.3);
    expect(env.update(130, DT)).toBe(1);
    expect(run(env, 130, 0.5)).toBeLessThan(0.05);
  });

  test("inward, falling and missing flow show nothing", () => {
    const env = new BurstEnvelope(500);
    expect(env.update(-500, DT)).toBe(0);
    run(env, 900, 0.5);
    expect(env.update(100, DT)).toBe(0);
    expect(env.update(NaN, DT)).toBe(0);
  });
});
