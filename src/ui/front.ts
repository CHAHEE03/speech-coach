/**
 * The mouth seen from the front, in face cm (x right, y up, 0 at the mouth's middle), from the
 * engine's articulation: the lips' opening (lipAp, cm), their spread or rounding (lipWidth 0 round …
 * 1 spread) and protrusion (lipProt), the gap between the front teeth (jaw, cm at the incisors), and
 * the tongue tip's height (ttY: high for ㄴ ㄷ ㄹ). Pure, so tests can check it.
 */
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

export function frontShape(a: { jaw: number; lipAp: number; lipProt: number; lipWidth: number; ttY: number }) {
  const prot = clamp(a.lipProt, 0, 1.5) / 1.5;
  const spread = clamp(a.lipWidth, 0, 1);
  const open = clamp(a.lipAp, 0, 2.4);
  const jaw = clamp(a.jaw, -0.1, 2.6);
  // corner to corner: rounded and pushed out lips are narrow, spread ones wide
  const lipsW = (2.9 + 2.3 * spread) * (1 - 0.18 * prot);
  // the opening: a slit when spread, a near-circle when rounded
  const openW = open <= 0 ? 0 : Math.min(lipsW - 0.6, lerp(0.9 + 0.9 * open, lipsW - 0.7, spread));
  const upperEdge = 0.15 + 0.3 * open; // the upper lip lifts a little
  const lowerEdge = upperEdge - open;
  // the upper incisors hang from the skull just behind the upper lip; the lower ones ride the jaw
  const upperTeeth = 0.2;
  const lowerTeeth = upperTeeth - Math.max(0, jaw);
  // the tongue's top: low behind the lower teeth, up to the upper teeth for a raised tip (ttY 5 … 10.8)
  const tongueTop = lerp(lowerTeeth - 0.35, upperTeeth + 0.1, clamp((a.ttY - 7.2) / 2.6, 0, 1));
  return { lipsW, openW, open, upperEdge, lowerEdge, upperTeeth, lowerTeeth, tongueTop, prot, jaw, spread };
}

export type FrontShape = ReturnType<typeof frontShape>;
export type P2 = [number, number];

/** A cubic Bézier from p0 to p3, sampled into n segments (n + 1 points, the first included). */
function cubic(p0: P2, p1: P2, p2: P2, p3: P2, n = 12): P2[] {
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}

/**
 * The lips from the front as outlines in face cm: the whole lips (`outer`, closed, corner → upper
 * edge with its cupid's bow → corner → round lower edge), the upper lip alone (`upper`, for its
 * darker colour), and the opening (`opening`, closed; null when the lips touch). The corners meet at
 * points; the opening is a lens with pointed corners when the lips spread and close to a circle when
 * they round; pushed-out lips are fuller and their bow flatter.
 */
export function lipShapes(s: FrontShape): { outer: P2[]; upper: P2[]; opening: P2[] | null; cornerY: number; half: number; topU: number; botL: number } {
  const W = s.lipsW / 2;
  const oy = (s.upperEdge + s.lowerEdge) / 2;
  const cy = oy; // the corners sit level with the middle of the opening
  const topU = s.upperEdge + 0.55 + 0.25 * s.prot; // the upper lip's top edge (the vermilion border)
  const botL = s.lowerEdge - 0.8 - 0.3 * s.prot; // the lower lip's bottom edge
  // the cupid's bow: two peaks either side of a dip under the nose's groove, flatter when pursed
  const bx = 0.05 + 0.38 * Math.min(1, W / 2.2);
  const dip = 0.14 * (1 - 0.6 * s.prot);
  const upperEdgeLine: P2[] = [
    ...cubic([-W, cy], [-W * 0.8, cy + (topU - cy) * 0.55], [-bx - 0.5 * (W - bx), topU], [-bx, topU]),
    ...cubic([-bx, topU], [-bx * 0.5, topU], [-bx * 0.2, topU - dip], [0, topU - dip]).slice(1),
    ...cubic([0, topU - dip], [bx * 0.2, topU - dip], [bx * 0.5, topU], [bx, topU]).slice(1),
    ...cubic([bx, topU], [bx + 0.5 * (W - bx), topU], [W * 0.8, cy + (topU - cy) * 0.55], [W, cy]).slice(1),
  ];
  const lowerEdgeLine: P2[] = [
    ...cubic([W, cy], [W * 0.85, cy - (cy - botL) * 0.7], [W * 0.45, botL], [0, botL]),
    ...cubic([0, botL], [-W * 0.45, botL], [-W * 0.85, cy - (cy - botL) * 0.7], [-W, cy]).slice(1),
  ];
  const outer = [...upperEdgeLine, ...lowerEdgeLine.slice(1)];

  let opening: P2[] | null = null;
  let innerTop: P2[];
  const ow = s.openW / 2, oh = s.open / 2;
  if (s.open > 0.02 && ow > 0.025) {
    // controls at 4/3 of the half-height put the arc's top at the opening's edge; their spread sets
    // the corners: pointed (a lens) for spread lips, rounded (near a circle) for rounded ones
    const cx = ow * (0.5 + 0.5 * (1 - s.spread));
    const top = cubic([-ow, oy], [-cx, oy + (4 / 3) * oh], [cx, oy + (4 / 3) * oh], [ow, oy], 16);
    const bottom = cubic([ow, oy], [cx, oy - (4 / 3) * oh], [-cx, oy - (4 / 3) * oh], [-ow, oy], 16);
    opening = [...top, ...bottom.slice(1)];
    // the upper lip's inner edge: the corner, along the meeting line to the opening, over it, back out
    innerTop = [[W, cy], ...top.slice().reverse(), [-W, cy]];
  } else {
    // closed: the line where the lips meet dips a little under the bow
    innerTop = cubic([W, cy], [W * 0.4, cy], [W * 0.2, cy - 0.06], [0, cy - 0.06]).concat(cubic([0, cy - 0.06], [-W * 0.2, cy - 0.06], [-W * 0.4, cy], [-W, cy]).slice(1));
  }
  const upper = [...upperEdgeLine, ...innerTop.slice(1)];
  return { outer, upper, opening, cornerY: cy, half: W, topU, botL };
}
