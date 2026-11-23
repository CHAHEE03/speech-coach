/**
 * App state: the voice (body, source, articulation), the audio's start, and what the head view
 * shows. Cut down from CHIMERA's store to what pronunciation practice uses: no modes, songs,
 * speech, beats, creatures or MIDI.
 */
import { create } from "zustand";
import { engine } from "../audio/AudioEngine.ts";
import { DEFAULT_SOURCE, NEUTRAL, restTip, type HumanArtic, type VoiceSource } from "../wasm/engine.ts";
import { defaultF0, PRESETS, sameBody, type BodyMix } from "./body.ts";

export interface ViewOptions {
  pressure: boolean;
  particles: boolean;
  grid: boolean;
  calipers: boolean;
  threeD: boolean;
}

interface State {
  started: boolean;
  starting: boolean;
  startError: string | null;
  /** the device couldn't keep up at 48 kHz: the voice runs at 32 kHz (see AudioEngine) */
  lightAudio: boolean;
  overloaded: boolean;
  body: BodyMix;
  source: VoiceSource;
  artic: HumanArtic;
  tipFree: boolean;
  volume: number;
  /** breathing: the voice sounds */
  hold: boolean;
  view: ViewOptions;
  start: () => Promise<void>;
  setBody: (b: BodyMix) => void;
  setSource: (v: Partial<VoiceSource>) => void;
  setArtic: (v: Partial<HumanArtic>, tipFree?: boolean) => void;
  setVolume: (v: number) => void;
  setHold: (h: boolean) => void;
  toggleBreath: () => Promise<void>;
  setView: (v: Partial<ViewOptions>) => void;
}

/** Everything the voice plays from, sent to an engine that knows none of it (a new one). */
function sendState(s: State) {
  engine.setVolume(s.volume);
  if (!sameBody(s.body, PRESETS.male)) engine.setBody(s.body);
  engine.setSource(s.source);
  engine.setArtic(s.artic, s.tipFree);
  engine.gate(s.hold ? 1 : 0);
}

let startPromise: Promise<void> | null = null;

export const useStore = create<State>((set, get) => ({
  started: false,
  starting: false,
  startError: null,
  lightAudio: false,
  overloaded: false,
  body: PRESETS.male,
  source: { ...DEFAULT_SOURCE },
  artic: (() => {
    const tip = restTip(NEUTRAL.jaw, NEUTRAL.tbX, NEUTRAL.tbY);
    return { ...NEUTRAL, ttX: tip.x, ttY: tip.y };
  })(),
  tipFree: true,
  volume: 0.8,
  hold: false,
  view: { pressure: false, particles: false, grid: false, calipers: false, threeD: false },
  start: () => {
    if (get().started) return Promise.resolve();
    if (startPromise) return startPromise;
    set({ starting: true, startError: null });
    startPromise = (async () => {
      try {
        await engine.start();
        // anything set before audio existed was not delivered: send the whole state now
        sendState(get());
        set({ started: true, starting: false });
      } catch (e) {
        set({ starting: false, startError: e instanceof Error ? e.message : String(e) });
      } finally {
        startPromise = null;
      }
    })();
    return startPromise;
  },
  setBody: (b) => {
    set((s) => ({ body: b, source: { ...s.source, f0: defaultF0(b) } }));
    engine.setBody(b);
  },
  setSource: (v) => {
    set((s) => ({ source: { ...s.source, ...v } }));
    engine.setSource(v);
  },
  setArtic: (v, tipFree) => {
    set((s) => ({ artic: { ...s.artic, ...v }, tipFree: tipFree ?? s.tipFree }));
    engine.setArtic(v, tipFree);
  },
  setVolume: (v) => {
    set({ volume: v });
    engine.setVolume(v);
  },
  setHold: (h) => {
    set({ hold: h });
    engine.gate(h ? 1 : 0);
  },
  toggleBreath: async () => {
    if (get().hold) return get().setHold(false);
    // on at once, so a second press while the audio starts turns it off again
    get().setHold(true);
    await get().start();
    // the audio didn't start: nothing breathes, so the button offers a retry
    if (!get().started) get().setHold(false);
  },
  setView: (v) => set((s) => ({ view: { ...s.view, ...v } })),
}));

engine.onStatus(() => useStore.setState({ lightAudio: engine.light, overloaded: engine.overloaded }));
// the lighter audio is a new engine: send it the state again
engine.onRebuilt(() => sendState(useStore.getState()));
