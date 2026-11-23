/**
 * Formants of a recorded voice, by linear prediction (LPC), the way Praat does it: resample to
 * ~11 kHz (formants up to 5.5 kHz), pre-emphasise, window, fit an all-pole filter and read the
 * formants off its poles. Pure: no DOM, so the tests run it on synthetic vowels.
 */

const TARGET_RATE = 11025;
const ORDER = 12; // 2 + rate/1 kHz: five formants plus the source's tilt

/** Formant frequencies (Hz, ascending) of `x` sampled at `fs`, or null for silence. */
export function formants(x: Float32Array, fs: number): number[] | null {
  // shortcut: a box-filter decimator aliases some 6–9 kHz energy (fricatives) onto 3–6 kHz; vowels
  // carry little there. Swap in a proper low-pass if F3+ is ever used.
  const q = Math.max(1, Math.round(fs / TARGET_RATE));
  const rate = fs / q;
  const n = Math.floor(x.length / q);
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < q; k++) s += x[i * q + k];
    y[i] = s / q;
  }
  // pre-emphasis from 50 Hz, then a Hamming window
  const pre = Math.exp((-2 * Math.PI * 50) / rate);
  for (let i = n - 1; i > 0; i--) y[i] -= pre * y[i - 1];
  for (let i = 0; i < n; i++) y[i] *= 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1));

  const r = new Float64Array(ORDER + 1);
  for (let lag = 0; lag <= ORDER; lag++) for (let i = lag; i < n; i++) r[lag] += y[i] * y[i - lag];
  if (!(r[0] > 1e-12)) return null;
  r[0] *= 1 + 1e-9; // a hair of white noise keeps the recursion stable

  const a = levinson(r);
  if (!a) return null;
  const out: number[] = [];
  for (const [re, im] of roots(a)) {
    if (im <= 0) continue; // one of each conjugate pair
    const f = (Math.atan2(im, re) * rate) / (2 * Math.PI);
    const bw = (-Math.log(Math.hypot(re, im)) * rate) / Math.PI;
    if (f > 90 && f < rate / 2 - 50 && bw < 500) out.push(f);
  }
  return out.sort((p, q2) => p - q2);
}

/** Levinson–Durbin: autocorrelation → predictor [1, a1 … ap], or null if it isn't stable. */
function levinson(r: Float64Array): Float64Array | null {
  const p = r.length - 1;
  const a = new Float64Array(p + 1);
  a[0] = 1;
  let err = r[0];
  for (let i = 1; i <= p; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
    const k = -acc / err;
    const prev = a.slice();
    for (let j = 1; j < i; j++) a[j] = prev[j] + k * prev[i - j];
    a[i] = k;
    err *= 1 - k * k;
    if (!(err > 0)) return null;
  }
  return a;
}

/** Roots of z^p + c1 z^(p-1) + … + cp (c = [1, c1 … cp]) by Durand–Kerner. */
function roots(c: Float64Array): [number, number][] {
  const p = c.length - 1;
  const z: [number, number][] = [];
  for (let i = 0; i < p; i++) {
    // distinct starting points on a spiral, the usual (0.4 + 0.9i)^k
    const ang = i * Math.atan2(0.9, 0.4), mag = Math.pow(Math.hypot(0.4, 0.9), i);
    z.push([mag * Math.cos(ang), mag * Math.sin(ang)]);
  }
  for (let iter = 0; iter < 500; iter++) {
    let moved = 0;
    for (let i = 0; i < p; i++) {
      const [zr, zi] = z[i];
      // numerator: the polynomial at z_i (Horner)
      let nr = 1, ni = 0;
      for (let k = 1; k <= p; k++) {
        const t = nr * zr - ni * zi + c[k];
        ni = nr * zi + ni * zr;
        nr = t;
      }
      // denominator: product of (z_i − z_j)
      let dr = 1, di = 0;
      for (let j = 0; j < p; j++) {
        if (j === i) continue;
        const er = zr - z[j][0], ei = zi - z[j][1];
        const t = dr * er - di * ei;
        di = dr * ei + di * er;
        dr = t;
      }
      const d2 = dr * dr + di * di || 1e-30;
      const qr = (nr * dr + ni * di) / d2, qi = (ni * dr - nr * di) / d2;
      z[i] = [zr - qr, zi - qi];
      moved = Math.max(moved, Math.hypot(qr, qi));
    }
    if (moved < 1e-12) break;
  }
  return z;
}
