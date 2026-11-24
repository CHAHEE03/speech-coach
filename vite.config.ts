import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode, isPreview }) => {
  const lan = command === "serve" && !isPreview && mode === "lan";
  const key = new URL("./.certs/lan-key.pem", import.meta.url);
  const cert = new URL("./.certs/lan-cert.pem", import.meta.url);

  // Fail clearly instead of falling back to HTTP, where tablet microphones cannot work.
  if (lan && (!existsSync(key) || !existsSync(cert))) {
    throw new Error("LAN HTTPS certificates are missing. Follow 'Open it on a tablet' in README.md.");
  }

  return {
    plugins: [react()],
    worker: { format: "es" },
    build: { target: "es2022", sourcemap: true },
    server: {
      host: lan ? "0.0.0.0" : "127.0.0.1",
      port: 5320,
      strictPort: true,
      allowedHosts: true,
      https: lan ? { key: readFileSync(key), cert: readFileSync(cert) } : undefined,
    },
    preview: { host: "127.0.0.1", port: 5321, strictPort: true, allowedHosts: true },
  };
});
