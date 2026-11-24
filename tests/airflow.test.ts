/**
 * How much air leaves the lips when a Korean stop is released, through the engine (the same path
 * Speak takes): an aspirated stop (ㅋ ㅍ) lets out a burst several times the plain (ㄱ ㅂ) and tense
 * (ㄲ ㅃ) ones'. This is what an airflow picture can teach, so the picture has a contrast to show.
 * Measured 2026-11-24: release peaks ㄱ ~90, ㄲ ~120, ㅋ ~890; ㅂ ~110, ㅃ ~350, ㅍ ~1110 cm³/s.
 */
import { describe, expect, test } from "bun:test";
import { initEngine, WasmVoice } from "./harness.ts";

await initEngine();
const { planPhrases } = await import("../src/wasm/engine.ts");
const { koreanPhrases, between } = await import("../src/ui/korean.ts");
const male = { female: 0, child: 0 };
const LEAD = 0.03; // the worklet's scheduling lead
const STEP = 240; // 5 ms at 48 kHz

/** The largest mean airflow at the lips in the 120 ms after the consonant's release (아{C}아). */
function releasePeak(consonant: string): number {
  const v = new WasmVoice(48000);
  const plan = planPhrases(koreanPhrases(between(consonant, "ㅏ")), { body: male, t0: 0, rate: 1, f0: 110 });
  v.schedule(plan.gestures, LEAD);
  // segments: a, the consonant, a: the release is where the consonant ends
  const release = plan.segments[1].t1 + LEAD;
  let peak = -Infinity;
  for (let t = 0; t < release + 0.12; t += STEP / 48000) {
    v.render(STEP);
    if (t >= release) peak = Math.max(peak, v.airflow().lips);
  }
  return peak;
}

describe("airflow at the lips on a stop's release", () => {
  for (const [plain, tense, aspirated] of [["ㄱ", "ㄲ", "ㅋ"], ["ㅂ", "ㅃ", "ㅍ"]]) {
    test(`${aspirated} lets out far more air than ${plain} and ${tense}`, () => {
      const p = releasePeak(plain), t = releasePeak(tense), a = releasePeak(aspirated);
      expect(a).toBeGreaterThan(2.5 * Math.max(p, t));
      expect(a).toBeGreaterThan(500);
    });
  }
});
