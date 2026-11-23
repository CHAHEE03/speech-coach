/**
 * The learner's microphone: what vowel (F1, F2) they are saying right now. Its own AudioContext,
 * apart from the engine's, so the synth's output never reaches the analyser.
 */
import { formants } from "./formants.ts";

// shortcut: a fixed level gate (−40 dBFS); a quiet mic or a far face misses it. Calibrate per device if it does.
const GATE = 0.01;

class Mic {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private buf = new Float32Array(2048);
  /** the last few frames, for a median that drops a stray pole */
  private recent: [number, number][] = [];

  get on(): boolean {
    return !!this.analyser;
  }

  /** Asks for the mic. Throws if the browser or the user refuses. */
  async start(): Promise<void> {
    if (this.on) return;
    // the browser's voice processing (noise suppression, auto gain) bends the formants
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = this.buf.length;
    ctx.createMediaStreamSource(stream).connect(analyser);
    await ctx.resume();
    Object.assign(this, { ctx, stream, analyser, recent: [] });
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close().catch(() => {});
    Object.assign(this, { ctx: null, stream: null, analyser: null, recent: [] });
  }

  /** F1 and F2 of what the mic hears now, or null when it's quiet or not on. */
  read(): { F1: number; F2: number } | null {
    if (!this.analyser || !this.ctx) return null;
    this.analyser.getFloatTimeDomainData(this.buf);
    let e = 0;
    for (const v of this.buf) e += v * v;
    if (Math.sqrt(e / this.buf.length) < GATE) {
      this.recent = [];
      return null;
    }
    const f = formants(this.buf, this.ctx.sampleRate);
    if (!f || f.length < 2) return null;
    this.recent.push([f[0], f[1]]);
    if (this.recent.length > 5) this.recent.shift();
    const med = (i: 0 | 1) => this.recent.map((p) => p[i]).sort((a, b) => a - b)[this.recent.length >> 1];
    return { F1: med(0), F2: med(1) };
  }
}

export const mic = new Mic();
