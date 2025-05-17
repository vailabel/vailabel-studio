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
      "@vailable/core": path.resolve(__dirname, "../core/src"),
    },
  },
  optimizeDeps: {
    include: ["@vailable/core"],
  },
  server: {
    host: "localhost",
    port: 5173,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
  },
})
