import { lazy, Suspense, useState } from "react";
import { useStore } from "./store.ts";
import { AnatomyView } from "./components/AnatomyView.tsx";
import { MicButton, VowelMap } from "./components/VowelMap.tsx";
import { Segmented, Toggle } from "./components/Controls.tsx";
import { Chip, Screen } from "./components/Screen.tsx";
import { SpeakRight, speechInfo, speechSlots, speechWords } from "./components/SpeakPanel.tsx";
import { SpectrumView } from "./components/SpectrumView.tsx";
import { Spectrogram } from "./components/Spectrogram.tsx";
import { VoiceControls } from "./components/VoiceControls.tsx";
import { FrontView } from "./components/FrontView.tsx";
import { PRESETS, presetOf } from "./body.ts";
import { lang, setLang, t, type Lang } from "./i18n.ts";
import type { BodyName } from "../worklet/protocol.ts";

// three.js is large: load the 3D head only when it's asked for
const AnatomyView3D = lazy(() => import("./components/AnatomyView3D.tsx").then((m) => ({ default: m.AnatomyView3D })));

type Tab = "vowels" | "speak" | "sound" | "voice";

/** What the head draws over itself: Speak's readouts and the word at the mouth, else the defaults. */
function Head(props: { tab: Tab }) {
  const threeD = useStore((s) => s.view.threeD);
  const Face = threeD ? AnatomyView3D : AnatomyView;
  const speak = props.tab === "speak" ? { slots: speechSlots, info: speechInfo, overlay: speechWords } : {};
  return (
    <Suspense fallback={null}>
      <Face {...speak} />
    </Suspense>
  );
}

function ViewToggles() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  return (
    <div className="view-toggles">
      <Toggle label="3D" checked={view.threeD} onChange={(v) => setView({ threeD: v })} />
      {!view.threeD && <Toggle label="Neon" checked={!view.illustration} onChange={(v) => setView({ illustration: !v })} />}
      {!view.threeD && view.illustration && <Toggle label="Names" checked={view.labels} onChange={(v) => setView({ labels: v })} />}
      {!view.threeD && view.illustration && <Toggle label="Tissue" checked={view.tissue} onChange={(v) => setView({ tissue: v })} />}
      <Toggle label="Airflow" checked={view.particles} onChange={(v) => setView({ particles: v })} />
      <Toggle label="Sound pressure" checked={view.pressure} onChange={(v) => setView({ pressure: v })} />
      <Toggle label="Measurements" checked={view.calipers} onChange={(v) => setView({ calipers: v })} />
      <Toggle label="Grid" checked={view.grid} onChange={(v) => setView({ grid: v })} />
    </div>
  );
}

/** The head on the left; on the right, one tab at a time: vowels with the mic, speaking, the sound, the voice's dials. */
export function App() {
  const [tab, setTab] = useState<Tab>("vowels");
  const body = useStore((s) => s.body);
  const setBody = useStore((s) => s.setBody);
  const hold = useStore((s) => s.hold);
  const starting = useStore((s) => s.starting);
  const startError = useStore((s) => s.startError);
  const toggleBreath = useStore((s) => s.toggleBreath);
  return (
    <div className="app">
      <header className="topbar">
        <h1>{t("Pronunciation practice")}</h1>
        <Segmented<BodyName>
          label={t("Voice")}
          value={presetOf(body)}
          onChange={(p) => setBody(PRESETS[p])}
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "child", label: "Child" },
          ]}
        />
        <Segmented<Lang> label="Language" value={lang} onChange={setLang} options={[{ value: "ko", label: "한국어" }, { value: "en", label: "EN" }]} />
      </header>
      <main className="screens">
        <div className="heads">
          <Screen
            className="s-head"
            title="Mouth and tongue"
            tools={
              <>
                <ViewToggles />
                <Chip on={hold} onClick={() => void toggleBreath()}>
                  {starting ? "Starting…" : "Sound"}
                </Chip>
              </>
            }
          >
            <Head tab={tab} />
          </Screen>
          <Screen className="s-front" title="Front view">
            <FrontView />
          </Screen>
        </div>
        <div className="side">
          <Segmented<Tab>
            label="Practice"
            value={tab}
            onChange={setTab}
            options={[
              { value: "vowels", label: "Vowels" },
              { value: "speak", label: "Speak" },
              { value: "sound", label: "Sound" },
              { value: "voice", label: "Voice" },
            ]}
          />
          {tab === "vowels" && (
            <Screen className="s-vowels" title="Vowels" sub="F1 / F2" tools={<MicButton />}>
              <VowelMap />
            </Screen>
          )}
          {tab === "speak" && <SpeakRight />}
          {tab === "sound" && (
            <>
              <Screen className="s-spec" title="Spectrum">
                <SpectrumView />
              </Screen>
              <Screen className="s-gram" title="Spectrogram">
                <Spectrogram />
              </Screen>
            </>
          )}
          {tab === "voice" && (
            <Screen className="s-voice" title="Voice">
              <VoiceControls />
            </Screen>
          )}
        </div>
      </main>
      {startError && <p className="error">{t("Sound could not start")}: {startError}</p>}
    </div>
  );
}
