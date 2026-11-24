/**
 * The head as a textbook illustration: the same midsagittal shapes the vector view outlines
 * (profile.ts and the engine's frame), filled with natural colours, so the tongue, lips, jaw and
 * soft palate move exactly as the voice does. Air is a dark mouth-interior colour, so the
 * pressure, airflow and turbulence overlays (drawn additively) still show on it.
 */
import type { HumanFrame } from "../../wasm/types.ts";
import type { Vec } from "./geom.ts";
import type { Profile } from "./profile.ts";
import { chaikin, type Pt } from "./vector.ts";
import { t } from "../i18n.ts";

export const ILLUSTRATION = {
  page: "#0d1216",
  skin: "#e8b895",
  skinLine: "#a8704f",
  bone: "#efe5cf",
  boneLine: "#b9a98a",
  brain: "#e9c3c0",
  brainLine: "#bf8f8c",
  tissue: "#d9867f",
  tissueLine: "#a65a55",
  air: "#2a1519",
  airLine: "#5a2e33",
  tongue: "#e2667a",
  tongueLine: "#9b2f45",
  lips: "#d4626e",
  lipsLine: "#93303d",
  teeth: "#fbf8f0",
  teethLine: "#a79f8d",
  cartilage: "#cfe0e6",
  cartilageLine: "#7f9aa5",
  eye: "#fbfbf7",
  iris: "#4a6b7d",
};

const C = ILLUSTRATION;

/** Fill (and optionally outline) a shape given in body cm. */
function shape(ctx: CanvasRenderingContext2D, P: (p: Vec) => Pt, pts: Vec[] | Pt[], fill: string | null, line: string | null, width = 1.2, close = true, toPx = true): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const [x, y] = toPx ? P(p as Vec) : (p as Pt);
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

/** A thick soft stroke (the soft palate, the epiglottis): tissue with a darker edge. */
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

/** A part's name, white with a dark edge so it reads on skin, bone, tissue or air. */
function tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number): void {
  ctx.font = `700 ${size}px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "rgba(20, 10, 12, 0.85)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x, y);
}

const mid = (v: Vec[]): Vec => ({ x: v.reduce((s, p) => s + p.x, 0) / v.length, y: v.reduce((s, p) => s + p.y, 0) / v.length });

/** The names of the parts that make speech, each on or beside its part (body cm offsets scale with the head). */
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
  at(G.palOral[Math.floor(G.palOral.length / 2)], 0, 0.28, "Hard palate");
  at(f.velum[Math.floor(f.velum.length / 2)], -0.4, -0.75, "Soft palate");
  at(mid(G.nasal), 0.2, 0.9, "Nasal cavity");
  const g = f.grid[Math.floor(f.grid.length * 0.22)];
  if (g) at({ x: (g.inner.x + g.outer.x) / 2, y: (g.inner.y + g.outer.y) / 2 }, -0.1, 0, "Pharynx");
  at(f.glottis, -1.6, 0, "Vocal folds");
  ctx.restore();
}

/**
 * Draw the head, back to front. `P` maps body cm to CSS px; `scale` is px per cm; `bulge` puffs the
 * cheeks (the vector view's puffProfile).
 */
export function drawIllustration(ctx: CanvasRenderingContext2D, G: Profile, f: HumanFrame, P: (p: Vec) => Pt, scale: number, bulge: (v: Vec[]) => Vec[]): void {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.lineJoin = "round";
  const soft = (v: Vec[], it = 2) => chaikin(v.map(P), it);

  // the head's silhouette: front of the neck up to the lower lip, across the mouth, the face and skull round to the back of the neck
  const skinLower = bulge(G.skinLower), skinUpper = bulge(G.skinUpper);
  shape(ctx, P, [...skinLower, ...skinUpper], C.skin, C.skinLine, 1.6);

  // skull and brain
  shape(ctx, P, G.skull, C.bone, C.boneLine, 1.2);
  shape(ctx, P, G.brain, C.brain, C.brainLine, 1);
  shape(ctx, P, G.sulcus, null, C.brainLine, 1, false);

  // the spine
  for (const v of G.vertebrae) shape(ctx, P, v, C.bone, C.boneLine, 1);

  // the walls of the throat and mouth: tissue between the skin and the airway
  shape(ctx, P, [...f.outer, ...f.inner.slice().reverse()], C.tissue, null);

  // the nose's cavity and its turbinates
  shape(ctx, P, G.nasal, C.air, C.airLine, 1);
  for (const tb of G.turbinates) shape(ctx, P, tb, C.tissue, C.tissueLine, 1);

  // the air column, glottis to lips, from the engine's cross-sections
  if (f.grid.length > 1) shape(ctx, P, [...f.grid.map((g) => g.inner), ...f.grid.map((g) => g.outer).reverse()], C.air, null);

  // the hard palate: bone between its oral and nasal surfaces
  shape(ctx, P, [...G.palOral, ...G.palNasal.slice().reverse()], C.bone, C.boneLine, 1);

  // the larynx: hyoid, thyroid cartilage, windpipe
  shape(ctx, P, G.hyoid, C.bone, C.boneLine, 1);
  shape(ctx, P, G.thyroid, C.cartilage, C.cartilageLine, 1);
  for (const tr of G.trachea) shape(ctx, P, tr, null, C.cartilageLine, 1.4, false);
  for (const r of G.rings) shape(ctx, P, r, C.cartilage, C.cartilageLine, 1);
  for (const fo of G.folds) shape(ctx, P, fo, C.lips, C.lipsLine, 1);
  band(ctx, f.epiglottis.slice(0, 3).map(P), 0.28 * scale, C.cartilage, C.cartilageLine);

  // the lower jaw: bone between its lower edge and the gum line
  shape(ctx, P, [...G.jawLower, ...G.jawUpper.slice().reverse()], C.bone, C.boneLine, 1.2);

  // the soft palate, hanging from the back of the hard palate
  band(ctx, soft(f.velum, 3), 0.42 * scale, C.tissue, C.tissueLine);

  // teeth
  shape(ctx, P, f.upperTeeth, C.teeth, C.teethLine, 1);
  shape(ctx, P, G.lowerTeeth, C.teeth, C.teethLine, 1);

  // the tongue: its outline closes along the floor of the mouth
  shape(ctx, P, f.tongue, C.tongue, C.tongueLine, 1.8);
  ctx.save();
  ctx.beginPath();
  f.tongue.forEach((p, i) => {
    const [x, y] = P(p);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.clip();
  for (const fb of G.fibres) shape(ctx, P, fb, null, "rgba(155, 47, 69, 0.28)", 0.8, false);
  ctx.restore();

  // lips
  shape(ctx, P, soft(bulge(f.upperLip)), C.lips, C.lipsLine, 1.5, true, false);
  shape(ctx, P, soft(bulge(f.lowerLip)), C.lips, C.lipsLine, 1.5, true, false);

  // the eye
  shape(ctx, P, G.eye, C.eye, C.skinLine, 1);
  const [ex, ey] = P(G.eyeC);
  ctx.beginPath();
  ctx.arc(ex + 0.55 * scale, ey, 0.32 * scale, 0, Math.PI * 2);
  ctx.fillStyle = C.iris;
  ctx.fill();

  ctx.restore();
}
