import type { SpeakLang } from "../speech.ts";
import { Chip } from "./Screen.tsx";

const LANGS: { value: SpeakLang; label: string; name: string }[] = [
  { value: "ko", label: "한국어", name: "Korean" },
  { value: "en", label: "EN", name: "English" },
];

/** The language typed words are read in: chips for a screen's tools. `off` lights none (IPA input). */
export function LangPick(props: { value: SpeakLang; onChange: (l: SpeakLang) => void; off?: boolean }) {
  return (
    <div className="lang-pick" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <Chip key={l.value} on={!props.off && props.value === l.value} onClick={() => props.onChange(l.value)} title={l.name} aria-label={l.name}>
          {l.label}
        </Chip>
      ))}
    </div>
  );
}
