/**
 * Entry: load the voice engine (wasm) first, since the UI calls into it as it loads, then render.
 * A failed load can be retried.
 */
import "./ui/styles.css";
import { initChimera } from "./wasm/chimera.ts";

const root = document.getElementById("root")!;

async function boot(): Promise<void> {
  try {
    await initChimera();
    const [{ createRoot }, { App }] = await Promise.all([import("react-dom/client"), import("./ui/App.tsx")]);
    createRoot(root).render(<App />);
  } catch (err) {
    root.replaceChildren();
    const box = document.createElement("div");
    box.className = "boot-error";
    const msg = document.createElement("p");
    msg.textContent = `음성 엔진을 불러오지 못했어요 (The voice engine could not load): ${err instanceof Error ? err.message : String(err)}`;
    const retry = document.createElement("button");
    retry.textContent = "다시 시도 (Try again)";
    retry.onclick = () => void boot();
    box.append(msg, retry);
    root.append(box);
  }
}

void boot();
