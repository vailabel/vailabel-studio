/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config"
import path from "path"
import react from "@vitejs/plugin-react"

// Vitest config for the studio app. Mirrors the `@` alias from vite.config.ts
// and keeps a jsdom + jest-dom setup so React component tests work out of the box.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Don't process CSS imports in tests (replaces jest's identity-obj-proxy).
    css: false,
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.config.{ts,js}",
        "**/*.d.ts",
        "**/__tests__/**",
        "**/*.{test,spec}.{ts,tsx}",
        "src/shared/ui/**",
        "src/main.tsx",
      ],
    },
  },
})
