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
  return { lipsW, openW, open, upperEdge, lowerEdge, upperTeeth, lowerTeeth, tongueTop, prot, jaw };
}
