/**
 * Render the Korean test words (words.tsv) through the engine, the way Speak says them: Hangul →
 * koreanPhrases → planPhrases → the engine's audio-thread ABI (as the worklet runs it), in a male
 * and a female voice. Writes <out>/<body>/<n>.wav (16-bit mono, 48 kHz, peak-normalised, 0.25 s of
 * silence either side) and <out>/manifest.json for score.py.
 *
 * usage: bun tools/korean/render.ts <out>    (needs src/wasm/chimera.wasm: bun run wasm)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { initEngine, WasmVoice } from "../../tests/harness.ts";

await initEngine();
const { planPhrases } = await import("../../src/wasm/engine.ts");
const { koreanPhrases } = await import("../../src/ui/korean.ts");

const FS = 48000;
const LEAD = 0.03; // the worklet's scheduling lead
const PAD = 0.25;
const BODIES = [
  { name: "male", female: 0, f0: 112 },
  { name: "female", female: 1, f0: 205 },
] as const;

const out = process.argv[2];
if (!out) throw new Error("usage: bun tools/korean/render.ts <out>");

const words = readFileSync(new URL("./words.tsv", import.meta.url), "utf8")
  .split("\n")
  .filter((l) => l.trim() && !l.startsWith("#"))
  .map((l) => {
    const [kind, text, group] = l.split("\t").map((s) => s.trim());
    return { kind, text, group };
  });

function writeWav(path: string, x: Float32Array): void {
  const buf = Buffer.alloc(44 + x.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + x.length * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(FS, 24);
  buf.writeUInt32LE(FS * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
  writeFileSync(path, buf);
}

const manifest: { kind: string; text: string; group: string; body: string; file: string; seconds: number }[] = [];
for (const body of BODIES) {
  mkdirSync(join(out, body.name), { recursive: true });
  words.forEach((w, n) => {
    const v = new WasmVoice(FS);
    if (body.female) v.setBody(body.female, 0);
    const plan = planPhrases(koreanPhrases(w.text), { body: { female: body.female, child: 0 }, t0: 0, rate: 1, f0: body.f0 });
    v.schedule(plan.gestures, LEAD);
    const audio = v.render(Math.ceil((plan.end + LEAD + 0.25) * FS));
    let peak = 0;
    for (const s of audio) peak = Math.max(peak, Math.abs(s));
    const pad = new Float32Array(Math.round(PAD * FS));
    const x = new Float32Array(pad.length * 2 + audio.length);
    x.set(audio.map((s) => (peak > 0 ? (0.7 * s) / peak : 0)), pad.length);
    const file = join(body.name, `${String(n).padStart(3, "0")}.wav`);
    writeWav(join(out, file), x);
    manifest.push({ ...w, body: body.name, file, seconds: x.length / FS });
  });
}
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 1));
console.log(`${manifest.length} renders (${words.length} words × ${BODIES.length} voices) in ${out}`);
