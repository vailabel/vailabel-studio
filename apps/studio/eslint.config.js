import { readdirSync } from "node:fs"
import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"

// ---------------------------------------------------------------------------
// Architecture boundaries (see ARCHITECTURE.md)
//
//   app  ──▶  features/<name> (public index only)  ──▶  shared
//
// Dependencies only point right. Features never import each other; code two
// features need lives in shared/. Only shared/ipc (and the desktop adapter)
// may touch Tauri, and only shared/services may issue backend commands — so
// feature code depends on the service API, never on the transport.
// ---------------------------------------------------------------------------

const features = readdirSync(new URL("./src/features", import.meta.url), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const noUpward = {
  group: ["@/features", "@/features/**", "@/app", "@/app/**"],
  message: "shared/ must not depend on features/ or app/.",
}
const noApp = {
  group: ["@/app", "@/app/**"],
  message: "Features must not depend on app/. Move what you need into shared/.",
}
const otherFeatures = (self) => ({
  group: features
    .filter((name) => name !== self)
    .flatMap((name) => [`@/features/${name}`, `@/features/${name}/**`]),
  message:
    "Features must not import each other. Move the shared piece into shared/.",
})
const featureInternals = {
  group: ["@/features/*/**"],
  message: "Import a feature through its public index (@/features/<name>).",
}
const tauri = {
  group: ["@tauri-apps/*", "@tauri-apps/*/**"],
  allowTypeImports: true,
  message:
    "Only shared/ipc and shared/lib/desktop.ts talk to Tauri. Add a wrapper there.",
}
const backendCommands = {
  group: ["@/shared/ipc/invoke", "@/shared/ipc/studio", "@/shared/ipc/cloud"],
  allowTypeImports: true,
  message: "Call the backend through @/shared/services, not the IPC layer.",
}

const boundary = (files, ...patterns) => ({
  files,
  rules: {
    "@typescript-eslint/no-restricted-imports": ["error", { patterns }],
  },
})

export default tseslint.config(
  { ignores: ["dist", "coverage", "src-tauri"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // `const { id, ...rest } = x` is how we omit a key.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true },
      ],
    },
  },

  boundary(["src/app/**"], featureInternals, tauri, backendCommands),
  ...features.map((name) =>
    boundary(
      [`src/features/${name}/**`],
      noApp,
      otherFeatures(name),
      tauri,
      backendCommands
    )
  ),
  boundary(["src/shared/**"], noUpward, tauri, backendCommands),
  boundary(["src/shared/services/**"], noUpward, tauri),
  boundary(["src/shared/ipc/**", "src/shared/lib/desktop.ts"], noUpward),

  {
    // Tests mock the transport directly.
    files: ["**/*.test.{ts,tsx}"],
    rules: { "@typescript-eslint/no-restricted-imports": "off" },
  },
  {
    // Vendored shadcn primitives export variants next to components by design.
    files: ["src/shared/ui/**"],
    rules: { "react-refresh/only-export-components": "off" },
  }
)
