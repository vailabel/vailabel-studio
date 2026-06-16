import { defineConfig } from "vite"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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
    sourcemap: true,
    target: process.env.TAURI_ENV_PLATFORM ? "chrome105" : "es2020",
    minify: process.env.TAURI_ENV_PLATFORM ? false : "esbuild",
  },
})
