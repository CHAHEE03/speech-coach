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

export const ILLUSTRATION = {
  page: "#0d1216",
  head: "#ece4da",
  headLine: "#8c8178",
  air: "#ffffff",
  tongue: "#f0918a",
  tongueLine: "#b5554f",
  lips: "#e8a19d",
  lipsLine: "#a9605c",
  velum: "#f4c08f",
  velumLine: "#b98446",
  teeth: "#ffffff",
  teethLine: "#8c8178",
  folds: "#e8a19d",
  text: "#20262b",
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

/** A thick soft stroke (the soft palate, the epiglottis) with a darker edge. */
function band(ctx: CanvasRenderingContext2D, pts: Pt[], width: number, fill: string, line: string): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = line;
  ctx.lineWidth = width + 2;
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = width;
  ctx.stroke();
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
  // the engine's cross-sections start a little above the glottis: the air reaches down to the folds
  if (f.grid.length > 1) shape(ctx, P, [f.glottis, ...f.grid.map((g) => g.inner), ...f.grid.map((g) => g.outer).reverse(), G.glottisWall[0]], C.air, null);
  // the windpipe, an air tube below the vocal folds
  const [tb, tf] = G.trachea;
  if (tb && tf) shape(ctx, P, [tb[0], tb[1], tf[1], tf[0]], C.air, null);
  // the airway's walls: the roof of the mouth and the back of the throat, and the front of the throat
  shape(ctx, P, G.palOral, null, C.headLine, 1.2, false);
  shape(ctx, P, G.outerWall, null, C.headLine, 1.2, false);
  shape(ctx, P, f.inner, null, C.headLine, 1, false);
  // the windpipe below the vocal folds
  for (const tr of G.trachea) shape(ctx, P, tr, null, C.headLine, 1.2, false);
  shape(ctx, P, f.epiglottis.slice(0, 3), null, C.headLine, 2, false);
  for (const fo of G.folds) shape(ctx, P, fo, C.folds, C.lipsLine, 1);

  // what moves when you speak, in colour
  band(ctx, soft(f.velum, 3), 0.42 * scale, C.velum, C.velumLine);
  shape(ctx, P, f.upperTeeth, C.teeth, C.teethLine, 1);
  shape(ctx, P, G.lowerTeeth, C.teeth, C.teethLine, 1);
  shape(ctx, P, f.tongue, C.tongue, C.tongueLine, 1.8);
  shape(ctx, P, soft(bulge(f.upperLip)), C.lips, C.lipsLine, 1.5, true, true);
  shape(ctx, P, soft(bulge(f.lowerLip)), C.lips, C.lipsLine, 1.5, true, true);

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
  const g = f.grid[Math.floor(f.grid.length * 0.22)];
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
