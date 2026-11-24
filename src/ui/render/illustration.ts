/**
 * The head as a simple teaching drawing, in the style of Wright & McCloy's CC0 midsagittal
 * sections (github.com/drammock/phonetics-teaching-assets): a plain silhouette with the mouth, nose
 * and throat cut out, and colour only on the parts that move when you speak (tongue, lips, soft
 * palate), plus the teeth. No brain, skull, eye or spine. The shapes are CHIMERA's (profile.ts and
 * the engine's frame), so they move exactly as the voice does.
 */
import type { HumanFrame } from "../../wasm/types.ts";
import type { Vec } from "./geom.ts";
import type { Profile } from "./profile.ts";
import { chaikin, type Pt } from "./vector.ts";
import { t } from "../i18n.ts";
import { BurstEnvelope } from "../burst.ts";

export const ILLUSTRATION = {
  page: "#0d1216",
  head: "#ece4da",
  headLine: "#8c8178",
  air: "#ffffff",
  tongue: "#f0918a",
  tongueLine: "#b5554f",
  lips: "#e8a19d",
  /** the epiglottis, a cartilage flap: lighter than the head */
  epiglottis: "#f6ece2",
  /** the hard palate's shelf, a little darker than the head so it reads as a part */
  palate: "#e0d2c3",
  /** the upper lip, a shade darker than the lower (it catches less light) */
  lipsUpper: "#d68b87",
  lipsLine: "#a9605c",
  velum: "#f4c08f",
  velumLine: "#b98446",
  teeth: "#ffffff",
  teethLine: "#8c8178",
  folds: "#e8a19d",
  text: "#20262b",
  /** airflow streaks and the noise of a hiss */
  flow: "#2f86d6",
  noise: "#5b6b78",
  /** solid overlays must keep their contrast against the white airway */
  pressure: ["#b58b20", "#dc701b", "#a51d24"] as const,
  grid: "#92999f",
  caliper: "#20262b",
  halo: "#ffffff",
};

const C = ILLUSTRATION;

/** Fill (and optionally outline) a shape; points are body cm unless `px`. */
function shape(ctx: CanvasRenderingContext2D, P: (p: Vec) => Pt, pts: Vec[] | Pt[], fill: string | null, line: string | null, width = 1.2, close = true, px = false): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const [x, y] = px ? (p as Pt) : P(p as Vec);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  if (close) ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (line) {
    ctx.strokeStyle = line;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}


/**
 * The nasopharynx (body cm): the air space from the back of the nasal cavity down behind the soft
 * palate to the top of the throat's back wall. `space` is the region to fill (it overlaps the nasal
 * cavity's back edge so the two read as one), `wall` its back wall to outline. The soft palate's
 * outline (f.velum) runs from where it hangs (index 0) back to its tip (its rearmost point); the
 * throat's back wall is f.outer up to the point before the one nearest that tip. Null if the shapes
 * are missing.
 */
export function nasopharynx(G: Profile, f: HumanFrame): { space: Vec[]; wall: Vec[] } | null {
  if (f.velum.length < 3 || f.outer.length < 3 || G.nasal.length < 3) return null;
  let tip = 0;
  for (let i = 1; i < f.velum.length; i++) if (f.velum[i].x < f.velum[tip].x) tip = i;
  const top = f.velum.slice(0, tip + 1); // root → tip along its upper surface
  const t = f.velum[tip];
  let near = 0;
  for (let i = 1; i < f.outer.length; i++) if (Math.hypot(f.outer[i].x - t.x, f.outer[i].y - t.y) < Math.hypot(f.outer[near].x - t.x, f.outer[near].y - t.y)) near = i;
  const wallTop = f.outer[Math.max(0, near - 1)];
  const back = G.nasal.reduce((b, p) => (p.x < b.x ? p : b));
  const behind = G.nasal.filter((p) => p.x < back.x + 0.7);
  const backTop = behind.reduce((b, p) => (p.y > b.y ? p : b));
  const backLow = behind.reduce((b, p) => (p.y < b.y ? p : b));
  // the back wall curves up and forward from the throat to the roof of the nasopharynx
  const wall: Vec[] = [wallTop, { x: wallTop.x - 0.25, y: (wallTop.y + backTop.y) / 2 }, { x: back.x - 0.4, y: backTop.y - 0.2 }, { x: backTop.x + 0.3, y: backTop.y }];
  const space: Vec[] = [...top, t, ...wall, { x: backLow.x + 0.3, y: backLow.y }, top[0]];
  return { space, wall };
}

/** Draw the head. `P` maps body cm to CSS px; `scale` is px per cm; `bulge` puffs the cheeks. */
export function drawIllustration(ctx: CanvasRenderingContext2D, G: Profile, f: HumanFrame, P: (p: Vec) => Pt, scale: number, bulge: (v: Vec[]) => Vec[]): void {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.lineJoin = "round";
  const soft = (v: Vec[], it = 2) => chaikin(v.map(P), it);

  // the silhouette: front of the neck to the lower lip, across the mouth, round the face and head to the back of the neck
  shape(ctx, P, [...bulge(G.skinLower), ...bulge(G.skinUpper)], C.head, C.headLine, 1.4);

  // the cavities cut out of it: the nose, and the air from the vocal folds to the lips
  shape(ctx, P, G.nasal, C.air, C.headLine, 1);
  // the nasopharynx: the nose's air space runs down behind the soft palate to the throat (the soft
  // palate, drawn over it below, closes or opens the way); it overlaps the nasal cavity's back edge
  const naso = nasopharynx(G, f);
  if (naso) {
    shape(ctx, P, naso.space, C.air, null);
    shape(ctx, P, naso.wall, null, C.headLine, 1.2, false);
  }
  // the engine's cross-sections start a little above the glottis: the air reaches down to the folds
  if (f.grid.length > 1) shape(ctx, P, [f.glottis, ...f.grid.map((g) => g.inner), ...f.grid.map((g) => g.outer).reverse(), G.glottisWall[0]], C.air, null);
  // the windpipe, an air tube below the vocal folds
  const [tb, tf] = G.trachea;
  if (tb && tf) shape(ctx, P, [tb[0], tb[1], tf[1], tf[0]], C.air, null);
  // the hard palate: a solid shelf between mouth and nose, both of its surfaces drawn
  shape(ctx, P, [...G.palOral, ...G.palNasal.slice().reverse()], C.palate, C.headLine, 1.2);
  // the airway's walls: the back of the throat, and the front of the throat
  shape(ctx, P, G.outerWall, null, C.headLine, 1.2, false);
  shape(ctx, P, f.inner, null, C.headLine, 1, false);
  // the windpipe below the vocal folds, its cartilage rings faint
  for (const tr of G.trachea) shape(ctx, P, tr, null, C.headLine, 1.2, false);
  ctx.globalAlpha = 0.45;
  for (const r of G.rings) shape(ctx, P, r, null, C.headLine, 1);
  // the lower jaw's edge under the skin, faint: the chin and floor of the mouth read as bone and tissue
  shape(ctx, P, G.jawLower, null, C.headLine, 1.2, false);
  ctx.globalAlpha = 1;
  // the epiglottis: a leaf-shaped flap behind the tongue's root (the engine's three points: base,
  // tip, front), rounded
  if (f.epiglottis.length >= 3) shape(ctx, P, soft(f.epiglottis.slice(0, 3), 3), C.epiglottis, C.headLine, 1.2, true, true);
  // the vocal folds, half again as big as the engine's wedges so they read at this size
  const g = f.glottis;
  for (const fo of G.folds) shape(ctx, P, fo.map((p) => ({ x: g.x + (p.x - g.x) * 1.5, y: g.y + (p.y - g.y) * 1.5 })), C.folds, C.lipsLine, 1.2);

  // the nostril's wing on the side of the nose
  const nose = G.nasal.reduce((b, p) => (p.x > b.x ? p : b), G.nasal[0]);
  if (nose) {
    const [nx, ny] = P({ x: nose.x + 0.05, y: nose.y + 0.15 });
    ctx.beginPath();
    ctx.ellipse(nx, ny, 0.6 * scale, 0.42 * scale, -0.2, Math.PI * 0.95, Math.PI * 2.05);
    ctx.strokeStyle = C.headLine;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // what moves when you speak, in colour. The soft palate is the engine's closed outline (its top
  // surface back to the uvula, then its underside forward): one tapered flap from the hard palate.
  shape(ctx, P, soft(f.velum, 2), C.velum, C.velumLine, 1.5, true, true);
  shape(ctx, P, soft(f.upperTeeth, 2), C.teeth, C.teethLine, 1, true, true);
  shape(ctx, P, soft(G.lowerTeeth, 2), C.teeth, C.teethLine, 1, true, true);
  // the tongue, its outline eased once so the root curves into the floor of the mouth instead of
  // meeting it in a point (one pass keeps the tip where the engine puts it for ㄷ ㄴ ㄹ)
  shape(ctx, P, soft(f.tongue, 1), C.tongue, C.tongueLine, 1.8, true, true);
  // lips as in the front view: the upper a shade darker than the lower
  shape(ctx, P, soft(bulge(f.upperLip)), C.lipsUpper, C.lipsLine, 1.5, true, true);
  shape(ctx, P, soft(bulge(f.lowerLip)), C.lips, C.lipsLine, 1.5, true, true);

  ctx.restore();
}

/** Normalized distance from the velum port to the nostrils selects a telemetry section. */
export function nasalFlowAt(flow: Float32Array | undefined, s: number): number {
  if (!flow?.length) return 0;
  const value = flow[Math.round(Math.max(0, Math.min(1, s)) * (flow.length - 1))];
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

// Nasals peak near 150 cm³/s, well below an aspirated oral burst; ignore tiny residual flow.
const nasalAmount = (flow: number): number => flow > 5 ? Math.min(1, flow / 200) : 0;

/** Per-view animation state, in body cm so resizing cannot leave trails across the face. */
export class NasalAirflow {
  readonly particles = Array.from({ length: 70 }, (_, i) => ({ s: (i * 0.618034) % 1, u: (i * 0.754878) % 1 * 2 - 1, amount: 0 }));
  puffs: { x: number; y: number; vx: number; vy: number; r: number; life: number }[] = [];
  private puffDebt = 0;
  /** shown only as the nose's air starts (see burst.ts): a full burst is a 100 cm³/s rise, a nasal is ~130 */
  private streakBurst = new BurstEnvelope(100);
  private puffBurst = new BurstEnvelope(100);

  update(flow: Float32Array | undefined, dt: number, length: number): void {
    dt = Math.max(0, Math.min(0.05, dt));
    // the strongest flow anywhere in the nose: air entering at the port counts before it reaches the nostrils
    let most = 0;
    if (flow) for (const v of flow) if (v > most) most = v;
    const gate = this.streakBurst.update(most, dt);
    for (const p of this.particles) {
      const amount = nasalAmount(nasalFlowAt(flow, p.s));
      if (amount) p.s = (p.s + (1.5 + 5 * amount) * dt / Math.max(0.01, length)) % 1;
      p.amount = nasalAmount(nasalFlowAt(flow, p.s)) * gate;
    }
    const nostrils = nasalFlowAt(flow, 1);
    const burst = this.puffBurst.update(nostrils, dt);
    const amount = nasalAmount(nostrils) > 0 ? burst : 0;
    // puffs already out drift and fade like the lips' do; a closed port only stops new ones
    this.puffs = this.puffs.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += 0.8 * dt;
      p.life -= 1.5 * dt;
      return p.life > 0;
    });
    if (!amount) {
      // no fractional emission carried over into the next nasal
      this.puffDebt = 0;
      return;
    }
    this.puffDebt += dt * 45 * amount;
    while (this.puffDebt >= 1 && this.puffs.length < 140) {
      this.puffDebt -= 1;
      const speed = 2.5 + 10 * amount;
      this.puffs.push({ x: 0, y: (Math.random() - 0.5) * 0.2, vx: speed, vy: -speed * 0.6 / 1.1 + (Math.random() - 0.5) * 1.4, r: 0.1 + 0.28 * amount, life: 1 });
    }
  }
}

/** Streaks sample the nasal tube's own flow; only the nostrils drive the outgoing puffs and tag. */
export function drawNasalFlow(ctx: CanvasRenderingContext2D, G: Profile, f: HumanFrame, P: (p: Vec) => Pt, scale: number, flow: Float32Array | undefined, dt: number, air: NasalAirflow): void {
  if (G.nasal.length < 3 || f.velum.length < 2 || !G.outerWall.length) {
    air.update(undefined, dt, 1);
    return;
  }
  const back = G.nasal.reduce((b, p) => (p.x < b.x ? p : b));
  const front = G.nasal.reduce((b, p) => (p.x > b.x ? p : b));
  const centre = mid(G.nasal);
  const vel = f.velum[Math.floor(f.velum.length / 2)];
  const wall = G.outerWall.reduce((b, p) => (Math.abs(p.y - vel.y) < Math.abs(b.y - vel.y) ? p : b), G.outerWall[0]);
  // the port: between the soft palate and the back of the throat
  const port = { x: (vel.x + wall.x) / 2, y: vel.y };
  let path: Pt[] = [port, { x: back.x + 0.4, y: back.y + 0.1 }, { x: centre.x, y: centre.y - 0.15 }, front, { x: front.x + 1.1, y: front.y - 0.6 }].map((p) => [p.x, p.y]);
  // This is an open airway: the tissue helper closes polygons back to their first point.
  for (let k = 0; k < 3; k++) {
    const smooth: Pt[] = [path[0]];
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      smooth.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    path = [...smooth, path[path.length - 1]];
  }
  const distances = [0];
  for (let i = 1; i < path.length; i++) distances.push(distances[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const length = distances[distances.length - 1];
  const point = (s: number, u: number): Pt => {
    const d = Math.max(0, Math.min(1, s)) * length;
    let i = 1;
    while (i < path.length - 1 && distances[i] < d) i++;
    const a = path[i - 1], b = path[i], span = Math.max(1e-6, distances[i] - distances[i - 1]);
    const along = (d - distances[i - 1]) / span, offset = u * 0.22;
    return P({ x: a[0] + (b[0] - a[0]) * along - (b[1] - a[1]) / span * offset, y: a[1] + (b[1] - a[1]) * along + (b[0] - a[0]) / span * offset });
  };
  air.update(flow, dt, length);
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = C.flow;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < air.particles.length; i++) {
    const p = air.particles[i];
    if (i / air.particles.length >= p.amount) continue;
    const [x, y] = point(p.s, p.u);
    const [px, py] = point(p.s - (0.08 + 0.18 * p.amount) / Math.max(0.01, length), p.u);
    const band = p.amount < 0.2 ? 0 : p.amount < 0.55 ? 1 : 2;
    ctx.lineWidth = [1.4, 2.6, 4.2][band];
    ctx.globalAlpha = [0.45, 0.7, 0.9][band];
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.lineWidth = 1.6;
  for (const puff of air.puffs) {
    const [x, y] = P({ x: front.x + puff.x, y: front.y + puff.y });
    ctx.globalAlpha = 0.85 * puff.life;
    ctx.beginPath();
    ctx.arc(x, y, puff.r * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Above the nose, clear of the cavity's own name; a port opening alone is not airflow.
  if (nasalFlowAt(flow, 1) > 30) {
    ctx.globalAlpha = 1;
    const [tx, ty] = P({ x: front.x + 0.2, y: front.y + 2.1 });
    tag(ctx, t("Air through the nose"), tx, ty, Math.max(12, Math.min(16, 0.55 * scale)));
  }
  ctx.restore();
}

/** A part's name: dark text on a white halo, readable on the drawing and on the page. */
function tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number): void {
  ctx.font = `700 ${size}px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = C.text;
  ctx.fillText(text, x, y);
}

const mid = (v: Vec[]): Vec => ({ x: v.reduce((s, p) => s + p.x, 0) / v.length, y: v.reduce((s, p) => s + p.y, 0) / v.length });

/** The names of the parts that make speech, each on or beside its part (offsets in body cm). */
export function drawPartNames(ctx: CanvasRenderingContext2D, G: Profile, f: HumanFrame, P: (p: Vec) => Pt, scale: number): void {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const size = Math.max(12, Math.min(17, 0.62 * scale));
  const at = (p: Vec, dx: number, dy: number, name: string) => {
    const [x, y] = P({ x: p.x + dx, y: p.y + dy });
    tag(ctx, t(name), x, y, size);
  };
  at(f.tongueCenter, -0.2, -1.0, "Tongue");
  const lipEdge = f.lowerLip[f.lowerLip.length - 1];
  at(lipEdge, 1.3, -0.4, "Lips");
  at(mid(f.upperTeeth), 0.1, 0.75, "Teeth");
  at(G.palOral[Math.floor(G.palOral.length / 2)], 0, 0.3, "Hard palate");
  at(f.velum[Math.floor(f.velum.length / 2)], -0.4, -0.75, "Soft palate");
  at(mid(G.nasal), 0.2, 0.2, "Nasal cavity");
  // low in the throat, clear of the soft palate's name when it hangs down
  const g = f.grid[Math.floor(f.grid.length * 0.12)];
  if (g) at({ x: (g.inner.x + g.outer.x) / 2, y: (g.inner.y + g.outer.y) / 2 }, -0.1, 0, "Pharynx");
  at(f.glottis, -1.6, 0, "Vocal folds");
  ctx.restore();
}

/** A handle in the drawing's style: a white dot ringed in its part's colour. */
export function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, ring: string, r: number, active: boolean): void {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.beginPath();
  ctx.arc(x, y, r + (active ? 2 : 0), 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fill();
  ctx.lineWidth = active ? 3 : 2;
  ctx.strokeStyle = ring;
  ctx.stroke();
  ctx.restore();
}
