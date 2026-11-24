/**
 * How much air left the lips while the voice spoke, over time, with the words underneath: the
 * engine's mean airflow at the lips (telemetry, cm³/s, smoothed ~30 ms), sampled every frame during
 * the current utterance and kept after it ends, so a burst can be looked at again. An aspirated
 * stop (ㅋ ㅍ) stands out as a tall peak; plain and tense ones (ㄱ ㄲ ㅂ ㅃ) hardly rise
 * (tests/airflow.test.ts). Every utterance also starts with a puff as the lungs come up.
 */
import { useEffect, useRef } from "react";
import { engine } from "../../audio/AudioEngine.ts";
import { t } from "../i18n.ts";
import { ILLUSTRATION as C } from "../render/illustration.ts";
import { currentPlan } from "../speech.ts";
import { useCanvasLoop } from "../useCanvas.ts";
import { planNow } from "./ScoreView.tsx";

/** a strong burst: an aspirated stop's release reaches ~900-1100 cm³/s */
const STRONG = 600;

export function AirflowGraph() {
  const samples = useRef<{ id: number; pts: [number, number][] }>({ id: -1, pts: [] });

  // record from each telemetry message, not each drawn frame: a slow or hidden page draws few frames,
  // and a burst lasts only ~100 ms
  useEffect(
    () =>
      engine.onTelemetry((tele) => {
        // fresh each time: the plan's start on the voice clock arrives later, without a notification
        const sp = currentPlan();
        if (!sp || sp.offset === null) return;
        const rec = samples.current;
        if (sp.id !== rec.id) {
          rec.id = sp.id;
          rec.pts = [];
        }
        const now = tele.t.clock - sp.offset;
        if (now < 0 || now > sp.plan.end + 0.3) return;
        const flow = tele.t.flow;
        const last = rec.pts[rec.pts.length - 1];
        if (!last || now > last[0]) rec.pts.push([now, Math.max(0, flow[flow.length - 1] ?? 0)]);
      }),
    [],
  );

  const ref = useCanvasLoop(({ ctx, w, h }) => {
    const sp = currentPlan();
    const rec = samples.current;
    const now = planNow(sp);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = C.page;
    ctx.fillRect(0, 0, w, h);
    const padL = 12, padR = 12, padT = 14, padB = 34;
    const gw = w - padL - padR, gh = h - padT - padB;
    if (gw <= 0 || gh <= 0) return;
    const span = sp ? sp.plan.end + 0.3 : 1;
    const top = Math.max(1000, ...rec.pts.map((p) => p[1]));
    const X = (tm: number) => padL + (tm / span) * gw;
    const Y = (v: number) => padT + gh - (v / top) * gh;

    // the strong-air line, and the baseline
    ctx.save();
    ctx.strokeStyle = "rgba(255, 179, 64, 0.55)";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, Y(STRONG));
    ctx.lineTo(padL + gw, Y(STRONG));
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(255, 179, 64, 0.9)";
    ctx.font = '600 12px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif';
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(t("Strong air"), padL + gw, Y(STRONG) - 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.beginPath();
    ctx.moveTo(padL, Y(0));
    ctx.lineTo(padL + gw, Y(0));
    ctx.stroke();

    if (!sp || rec.pts.length < 2) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '500 14px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif';
      ctx.fillText(t("Speak to see how much air leaves the mouth"), padL + gw / 2, padT + gh / 2);
      return;
    }

    // the airflow, filled
    ctx.beginPath();
    ctx.moveTo(X(rec.pts[0][0]), Y(0));
    for (const [tm, v] of rec.pts) ctx.lineTo(X(tm), Y(v));
    ctx.lineTo(X(rec.pts[rec.pts.length - 1][0]), Y(0));
    ctx.closePath();
    ctx.fillStyle = "rgba(47, 134, 214, 0.35)";
    ctx.fill();
    ctx.beginPath();
    rec.pts.forEach(([tm, v], i) => (i ? ctx.lineTo(X(tm), Y(v)) : ctx.moveTo(X(tm), Y(v))));
    ctx.strokeStyle = "#4da3f0";
    ctx.lineWidth = 2;
    ctx.stroke();

    // the words under their spans
    ctx.font = '600 14px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const wd of sp.words) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.moveTo(X(wd.t0), Y(0) + 4);
      ctx.lineTo(X(wd.t1), Y(0) + 4);
      ctx.stroke();
      ctx.fillStyle = "#e6f2f8";
      ctx.fillText(wd.text, X((wd.t0 + wd.t1) / 2), Y(0) + 8);
    }
    // where the voice is now
    if (now >= 0 && now <= span) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.beginPath();
      ctx.moveTo(X(now), padT);
      ctx.lineTo(X(now), Y(0));
      ctx.stroke();
    }
  });
  return <canvas ref={ref} className="airflow-graph" role="img" aria-label={t("How much air left the mouth while speaking")} />;
}
