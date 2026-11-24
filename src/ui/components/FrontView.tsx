/**
 * The mouth from the front, drawn from the same articulation that moves the side view: the lips'
 * opening (lipAp, cm), their spread or rounding (lipWidth 0 round … 1 spread) and protrusion
 * (lipProt), the gap between the front teeth (jaw, cm at the incisors), and the tongue's tip
 * (ttY: high for ㄴ ㄷ ㄹ). Puffs follow the measured airflow leaving the nostrils.
 * A mirror for the learner: copy the shape.
 */
import { useRef } from "react";
import { engine } from "../../audio/AudioEngine.ts";
import { VoiceModel } from "../analysis.ts";
import { sameBody } from "../body.ts";
import { t } from "../i18n.ts";
import { ILLUSTRATION as C } from "../render/illustration.ts";
import { useStore } from "../store.ts";
import { useCanvasLoop } from "../useCanvas.ts";
import { frontShape, lipShapes, type P2 } from "../front.ts";
import { BurstEnvelope } from "../burst.ts";

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export function FrontView() {
  const clockRef = useRef(0);
  /** the air leaving the mouth, eased (0 … 1) */
  const mouthAir = useRef(0);
  /** the air leaving the nostrils, eased (0 … 1) */
  const noseAir = useRef(0);
  /** bursts of air: a full one at 500 cm³/s above the recent average at the lips, 100 at the nostrils */
  const mouthBurst = useRef(new BurstEnvelope(500));
  const noseBurst = useRef(new BurstEnvelope(100));
  const ref = useCanvasLoop(({ ctx, w, h, dt }) => {
    const clock = (clockRef.current += dt);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = C.page;
    ctx.fillRect(0, 0, w, h);
    const st = useStore.getState();
    const tele = engine.latest && sameBody(engine.latest.body, st.body) ? engine.latest : null;
    const a = tele ? VoiceModel.articFromArray(tele.t.artic) : st.artic;
    const s = frontShape(a);

    // fit the lower face (about 12 × 11 cm) into the screen
    const k = Math.min(w / 13, h / 11.5);
    const cx = w / 2, cy = h * 0.5;
    const X = (x: number) => cx + x * k, Y = (y: number) => cy - y * k;

    // face: from under the eyes to the chin, the chin dropping with the jaw
    const chin = s.lowerEdge - 2.2 - 0.55 * s.jaw;
    ctx.beginPath();
    ctx.ellipse(X(0), Y((4.6 + chin) / 2), 5.6 * k, ((4.6 - chin) / 2) * k, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.head;
    ctx.fill();
    ctx.strokeStyle = C.headLine;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // nose: its base and two nostrils
    const noseY = 2.6;
    ctx.beginPath();
    ctx.moveTo(X(-1.6), Y(noseY + 0.2));
    ctx.quadraticCurveTo(X(0), Y(noseY - 0.5), X(1.6), Y(noseY + 0.2));
    ctx.strokeStyle = C.headLine;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    const nostrils = [-0.65, 0.65].map((x) => ({ x, y: noseY + 0.05 }));
    for (const n of nostrils) {
      ctx.beginPath();
      ctx.ellipse(X(n.x), Y(n.y), 0.42 * k, 0.2 * k, n.x < 0 ? 0.25 : -0.25, 0, Math.PI * 2);
      ctx.fillStyle = "#8c7466";
      ctx.fill();
    }
    // the groove from the nose to the lip
    ctx.beginPath();
    ctx.moveTo(X(-0.35), Y(noseY - 0.35));
    ctx.lineTo(X(-0.3), Y(s.upperEdge + 0.5));
    ctx.moveTo(X(0.35), Y(noseY - 0.35));
    ctx.lineTo(X(0.3), Y(s.upperEdge + 0.5));
    ctx.strokeStyle = "rgba(140, 129, 120, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // the lips (lipShapes): lower-lip colour over both, the upper lip darker, a soft shine on the lower
    const L = lipShapes(s);
    const path = (pts: P2[]) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      ctx.closePath();
    };
    ctx.lineJoin = "round";
    path(L.outer);
    ctx.fillStyle = C.lips;
    ctx.fill();
    path(L.upper);
    ctx.fillStyle = C.lipsUpper;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(X(0), Y(L.botL + 0.3 + 0.12 * s.prot), 0.32 * L.half * k, 0.12 * k, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fill();
    // pursed lips crease: short upright lines across both lips
    const pursed = Math.min(1, Math.max(0, (s.prot - 0.35) / 0.4)) * (1 - s.spread);
    if (pursed > 0.05) {
      ctx.strokeStyle = C.lipsLine;
      ctx.globalAlpha = 0.55 * pursed;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const f of [-0.62, -0.3, 0.3, 0.62]) {
        const x = f * L.half;
        ctx.moveTo(X(x), Y(L.topU - 0.08));
        ctx.lineTo(X(x * 0.92), Y(L.topU - 0.3));
        ctx.moveTo(X(x), Y(L.botL + 0.08));
        ctx.lineTo(X(x * 0.92), Y(L.botL + 0.34));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    path(L.outer);
    ctx.strokeStyle = C.lipsLine;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // the opening, with what shows through it: the mouth's dark inside, the tongue, the teeth
    if (L.opening) {
      ctx.save();
      path(L.opening);
      ctx.fillStyle = "#4a2329";
      ctx.fill();
      ctx.clip();
      // tongue
      ctx.beginPath();
      ctx.ellipse(X(0), Y(s.tongueTop - 1.2), 1.9 * k, 1.2 * k, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.tongue;
      ctx.fill();
      ctx.strokeStyle = C.tongueLine;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // teeth: six upper incisors and canines hanging down, six lower standing up
      const tooth = (x: number, edge: number, up: boolean) => {
        const tw = 0.56, th = 1.0;
        const y0 = up ? edge : edge - th;
        ctx.beginPath();
        ctx.roundRect(X(x - tw / 2), Y(y0 + th), tw * k, th * k, [up ? 0 : 3, up ? 0 : 3, up ? 3 : 0, up ? 3 : 0]);
        ctx.fillStyle = C.teeth;
        ctx.fill();
        ctx.strokeStyle = C.teethLine;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      };
      for (const x of [-1.45, -0.87, -0.29, 0.29, 0.87, 1.45]) {
        tooth(x, s.upperTeeth, true);
        tooth(x * 0.92, s.lowerTeeth, false);
      }
      ctx.restore();
      path(L.opening);
      ctx.strokeStyle = C.lipsLine;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // where the lips meet, from each corner in to the opening (or right across when closed)
    const reach = L.opening ? s.openW / 2 : 0;
    ctx.beginPath();
    ctx.moveTo(X(-L.half), Y(L.cornerY));
    ctx.quadraticCurveTo(X(-(L.half + reach) / 2), Y(L.cornerY - (L.opening ? 0 : 0.05)), X(-reach), Y(L.cornerY - (L.opening ? 0 : 0.06)));
    ctx.moveTo(X(L.half), Y(L.cornerY));
    ctx.quadraticCurveTo(X((L.half + reach) / 2), Y(L.cornerY - (L.opening ? 0 : 0.05)), X(reach), Y(L.cornerY - (L.opening ? 0 : 0.06)));
    ctx.strokeStyle = C.lipsLine;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // air out of the mouth, coming at the viewer: rings spreading from the lips, as many and as bold
    // as the airflow at the lips (a held vowel ~130 cm³/s: faint; an aspirated ㅋ ㅍ ~1000: strong)
    const lipFlow = tele && tele.t.gate > 0.5 ? Math.max(0, tele.t.flow[tele.t.flow.length - 1] ?? 0) : 0;
    // only as the air bursts out, not while it streams steadily (see burst.ts)
    const target = mouthBurst.current.update(lipFlow, dt);
    mouthAir.current += (target - mouthAir.current) * Math.min(1, dt * (target > mouthAir.current ? 14 : 5));
    const blow = mouthAir.current;
    if (blow > 0.04) {
      const oy = (s.upperEdge + s.lowerEdge) / 2;
      ctx.save();
      ctx.strokeStyle = C.flow;
      for (let i = 0; i < 3; i++) {
        const u = (clock * (0.8 + 1.6 * blow) + i / 3) % 1;
        ctx.globalAlpha = blow * (1 - u) * 0.9;
        ctx.lineWidth = 1.5 + 2.5 * blow;
        ctx.beginPath();
        ctx.ellipse(X(0), Y(oy), (Math.max(s.openW, 0.6) / 2 + 2.2 * u) * k, (Math.max(s.open, 0.3) / 2 + 1.4 * u) * k, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Nasal consonants reach ~150 cm³/s: make them clear, with the same quick rise and soft fade as the mouth.
    const noseFlow = tele ? Math.max(0, tele.t.nasalFlow[tele.t.nasalFlow.length - 1] ?? 0) : 0;
    const noseTarget = noseBurst.current.update(noseFlow, dt);
    noseAir.current += (noseTarget - noseAir.current) * Math.min(1, dt * (noseTarget > noseAir.current ? 14 : 5));
    const nasal = noseAir.current;
    if (nasal > 0.05) {
      ctx.save();
      ctx.strokeStyle = C.flow;
      ctx.lineCap = "round";
      for (const n of nostrils) {
        for (let i = 0; i < 3; i++) {
          const u = (clock * 1.6 + i / 3) % 1;
          const dir = n.x < 0 ? -1 : 1;
          const x0 = n.x + dir * (0.2 + 0.9 * u), y0 = n.y - 0.25 - 1.3 * u;
          ctx.globalAlpha = nasal * (1 - u);
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(X(x0), Y(y0));
          ctx.lineTo(X(x0 + dir * 0.35), Y(y0 - 0.45));
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    if (noseFlow > 30) {
      label(ctx, t("Air through the nose"), X(0), Y(4.15), k);
    }
  });
  return <canvas ref={ref} className="front-view" role="img" aria-label={t("The mouth from the front: lips, teeth and tongue")} />;
}

/** Dark text on a white halo, as the side view's part names. */
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, k: number): void {
  ctx.save();
  ctx.font = `700 ${Math.max(12, Math.min(16, 0.5 * k))}px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = C.text;
  ctx.fillText(text, x, y);
  ctx.restore();
}
