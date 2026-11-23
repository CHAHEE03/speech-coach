import { useStore } from "./store.ts";
import { AnatomyView } from "./components/AnatomyView.tsx";
import { MicButton, VowelMap } from "./components/VowelMap.tsx";
import { Segmented } from "./components/Controls.tsx";
import { Chip, Screen } from "./components/Screen.tsx";
import { PRESETS, presetOf } from "./body.ts";
import { lang, setLang, t, type Lang } from "./i18n.ts";

type Preset = keyof typeof PRESETS;

/** One screen: the head on the left, the vowel map with the learner's mic on the right. */
export function App() {
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
        <Segmented<Preset>
          label={t("Voice")}
          value={presetOf(body) as Preset | null}
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
        <Screen className="s-head" title="Mouth and tongue" tools={<Chip on={hold} onClick={() => void toggleBreath()}>{starting ? "Starting…" : "Sound"}</Chip>}>
          <AnatomyView />
        </Screen>
        <Screen className="s-vowels" title="Vowels" sub="F1 / F2" tools={<MicButton />}>
          <VowelMap />
        </Screen>
      </main>
      {startError && <p className="error">{t("Sound could not start")}: {startError}</p>}
    </div>
  );
}
