import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"

// Tauri sets these while it drives the build (`tauri dev` / `tauri build`).
const isTauri = Boolean(process.env.TAURI_ENV_PLATFORM)
const isTauriDebug = Boolean(process.env.TAURI_ENV_DEBUG)

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    // CodeMirror breaks if @codemirror/state (and friends) resolve to more than
    // one copy — force a single instance across @uiw/react-codemirror,
    // codemirror-json-schema, and their peers.
    dedupe: [
      "@codemirror/state",
      "@codemirror/view",
      "@codemirror/language",
      "@lezer/common",
    ],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    // Everything in dist/ is embedded in the desktop binary, so a release build
    // ships minified and without source maps (they were ~15 MB, 4.5x the JS).
    // `tauri build --debug` keeps readable output + maps for debugging.
    sourcemap: isTauri ? isTauriDebug : true,
    target: isTauri ? "chrome105" : "es2020",
    minify: isTauriDebug ? false : "esbuild",
  },
})
