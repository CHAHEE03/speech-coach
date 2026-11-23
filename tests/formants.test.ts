/**
 * The mic's formant tracker on synthetic vowels: a 120 Hz pulse train through resonators at known
 * formants, sampled at 48 kHz like a browser mic. It must find F1 and F2 within 8%.
 */
import { describe, expect, test } from "bun:test";
import { formants } from "../src/ui/formants.ts";

function vowel(fs: number, f0: number, fm: [number, number][], len: number): Float32Array {
  const warm = 4096;
  let x = new Float64Array(warm + len);
  const period = Math.round(fs / f0);
  for (let i = 0; i < x.length; i += period) x[i] = 1;
  // a glottal source falls ~12 dB/octave: two leaky integrators
  for (let pass = 0; pass < 2; pass++) for (let i = 1; i < x.length; i++) x[i] += 0.97 * x[i - 1];
  const mean = x.reduce((s, v) => s + v, 0) / x.length;
  for (let i = 0; i < x.length; i++) x[i] -= mean;
  for (const [f, bw] of fm) {
    const r = Math.exp((-Math.PI * bw) / fs), c = 2 * r * Math.cos((2 * Math.PI * f) / fs);
    const y = new Float64Array(x.length);
    for (let i = 0; i < x.length; i++) y[i] = x[i] + c * (y[i - 1] ?? 0) - r * r * (y[i - 2] ?? 0);
    x = y;
  }
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  return Float32Array.from(x.subarray(warm), (v) => (0.5 * v) / peak);
}

const near = (got: number, want: number) => expect(Math.abs(got / want - 1)).toBeLessThan(0.08);

describe("formants", () => {
  const cases: [string, [number, number][]][] = [
    ["ㅏ (a)", [[740, 90], [1370, 100], [2500, 150]]],
    ["ㅣ (i)", [[340, 60], [2220, 120], [3000, 180]]],
    ["ㅜ (u)", [[370, 60], [980, 90], [2300, 150]]],
  ];
  for (const fs of [44100, 48000])
    for (const [name, fm] of cases)
      test(`${name} at ${fs} Hz`, () => {
        const f = formants(vowel(fs, 120, fm, 2048), fs);
        expect(f).not.toBeNull();
        near(f![0], fm[0][0]);
        near(f![1], fm[1][0]);
      });

  test("a higher voice (220 Hz, female ㅏ)", () => {
    const f = formants(vowel(48000, 220, [[990, 110], [1790, 120], [2900, 180]], 2048), 48000);
    near(f![0], 990);
    near(f![1], 1790);
  });

  test("silence has no formants", () => {
    expect(formants(new Float32Array(2048), 48000)).toBeNull();
  });
});
