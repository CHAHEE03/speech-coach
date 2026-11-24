/**
 * Korean and English for the interface. Text stays written in English in the code; `t()` looks
 * it up at the shared components that draw text (label(), Screen, Segmented, Chip, buttons,
 * encoders), so most strings need no change where they are written. Anything missing stays English.
 * The choice is saved in the browser; switching reloads the page (no re-render plumbing).
 */

export type Lang = "en" | "ko";
const KEY = "chimera.lang";

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "ko") return saved;
  } catch {
    /* private window or no storage: fall through to the browser's language */
  }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export const lang: Lang = initial();

export function setLang(l: Lang): void {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* not saved; the reload below still can't switch, so say so in the console */
    console.warn("Language choice can't be saved in this browser");
  }
  location.reload();
}

/** English (lower case) → Korean. */
const KO: Record<string, string> = {
  // this app
  "pronunciation practice": "발음 연습",
  "mouth and tongue": "입과 혀",
  sound: "소리",
  "sound could not start": "소리를 켜지 못했어요",
  language: "언어",
  practice: "연습",
  neon: "네온",
  "front view": "정면",
  tissue: "휴지",
  "air from the mouth and nose": "입과 코에서 나간 바람",
  "strong air": "센 바람",
  "each word starts with a puff too; a strong second peak is ㅋ ㅌ ㅍ ㅊ": "단어를 시작할 때도 숨이 나와요. 그다음 크게 솟으면 ㅋ ㅌ ㅍ ㅊ",
  "speak to see mouth and nose airflow": "말하면 입과 코의 바람이 그려져요",
  "how much air left the mouth and nose while speaking": "말하는 동안 입과 코에서 나간 바람의 양",
  "air through the nose": "코로 공기가 나가요",
  "the mouth from the front: lips, teeth and tongue": "정면에서 본 입: 입술, 이, 혀",
  "textbook drawing": "교과서 그림",
  "press a consonant to see its drawing": "자음을 누르면 그림이 나와요",
  "tap a vowel to see its shape": "모음을 누르면 입 모양이 나와요",
  "vowel map. tap a vowel or drag to morph between vowels.": "모음 지도. 모음을 누르거나 드래그해서 모음 사이의 소리를 만들어 보세요.",
  "vowel position": "모음 위치",
  "wright & mccloy, cc0": "Wright & McCloy, CC0",
  "compare it with the moving head": "왼쪽 움직이는 그림과 비교해 보세요",
  "no drawing for this sound yet": "이 소리의 그림은 아직 없어요",
  names: "이름",
  "nasal cavity": "코안",
  pharynx: "인두",
  spectrogram: "스펙트로그램",
  // Speak
  "preparing…": "준비 중…",
  examples: "예시",
  rate: "속도",
  "text is ipa": "IPA로 입력",
  "gestural score": "움직임 악보",
  consonants: "자음",
  "between two vowels": "모음 사이에서",
  spread: "펴짐",
  closed: "닫힘",
  voiceless: "무성음",
  voiced: "유성음",
  // Korean consonant chart
  "plain · tense · aspirated": "예사소리 · 된소리 · 거센소리",
  "say it between two vowels": "두 모음 사이에서 말해요",
  gums: "잇몸",
  "hard palate": "센입천장",
  plosive: "파열음",
  affricate: "파찰음",
  fricative: "마찰음",
  nasal: "비음",
  liquid: "유음",
  "noise at": "마찰 위치",
  lungs: "폐 압력",
  "what to say": "말할 내용",
  "type something for the voice to say": "말할 단어나 문장을 입력하세요",
  // top bar and modes
  play: "직접 조작",
  speak: "말하기",
  sing: "노래",
  bestiary: "동물",
  beatbox: "비트박스",
  volume: "음량",
  plugin: "플러그인",
  "engine load": "엔진 부하",
  "a voice grown from a simulated airway": "시뮬레이션한 기도에서 자라난 목소리",
  // bodies
  male: "남성",
  female: "여성",
  child: "아이",
  // head view
  "sound pressure": "음압",
  airflow: "공기 흐름",
  measurements: "측정값",
  grid: "격자",
  tongue: "혀",
  jaw: "턱",
  lips: "입술",
  "soft palate": "연구개",
  shut: "닫힘",
  open: "열림",
  round: "둥글게",
  sealed: "닫힘",
  tract: "성도",
  mouth: "입",
  ring: "울림",
  "ring on": "울림 켬",
  "ring off": "울림 끔",
  // Play screens
  tube: "관",
  "glottis to lips": "성문에서 입술까지",
  glottis: "성문",
  velum: "연구개",
  teeth: "이",
  nose: "코",
  "vocal folds": "성대",
  "slowed 100×": "100배 느리게",
  front: "앞",
  area: "면적",
  flow: "흐름",
  spectrum: "스펙트럼",
  vowels: "모음",
  voice: "목소리",
  keys: "건반",
  breathe: "숨 쉬기",
  whisper: "속삭임",
  stop: "정지",
  "starting…": "시작 중…",
  mic: "마이크",
  "blocked by the browser": "브라우저가 막음",
  "no microphone": "마이크 없음",
  now: "지금",
  "start audio to see the sound": "소리를 켜면 보여요",
  // voice encoders
  tone: "음색",
  throat: "목",
  pitch: "음높이",
  breath: "숨",
  pressed: "성대 조임",
  vibrato: "떨림",
  breathy: "숨소리",
  bright: "밝기",
  rough: "거칠기",
  fry: "보컬 프라이",
  twang: "트왱",
  larynx: "후두",
  "false folds": "가성대",
  "lips open": "입술 벌림",
  protrude: "내밀기",
  rounding: "둥글리기",
  root: "혀뿌리",
  "tip curl": "혀끝 말기",
  glide: "미끄러짐",
};

/** The interface text for `en` in the chosen language. */
export function t(en: string): string {
  if (lang !== "ko") return en;
  // whole strings only: a word-by-word fallback would also translate words in typed lyrics
  return KO[en.toLowerCase()] ?? en;
}
