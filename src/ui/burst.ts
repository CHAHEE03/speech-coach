/**
 * Air shown only in the moment it bursts out, as the vocal-fold screen shows the glottis's flow as
 * pulses: a steady flow (a held vowel ~130 cm³/s at the lips, a held nasal ~130 at the nostrils)
 * fades from view, and a sudden rise (an aspirated release ~900, a nasal starting) shows for a
 * moment. The envelope is how far the flow stands above its own recent average (a first-order
 * high-pass on the flow, clipped at zero). Air drawn inwards counts as none.
 */
export class BurstEnvelope {
  private slow = 0;

  /**
   * @param scale cm³/s of rise above the recent average that reads as a full burst (1)
   * @param tau seconds the average takes to catch up: how long a burst stays visible
   */
  constructor(
    readonly scale: number,
    readonly tau = 0.12,
  ) {}

  /** Feed the flow now (cm³/s) and the time since the last call (s); returns the burst, 0 … 1. */
  update(flow: number, dt: number): number {
    const f = Number.isFinite(flow) ? Math.max(0, flow) : 0;
    const rise = f - this.slow;
    this.slow += (f - this.slow) * (1 - Math.exp(-Math.max(0, dt) / this.tau));
    return Math.min(1, Math.max(0, rise / this.scale));
  }
}
