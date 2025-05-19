import type { Config } from "jest"

const config: Config = {
  watchman: false,
  projects: [
    "<rootDir>/apps/core/jest.config.ts",
    "<rootDir>/apps/studio/jest.config.ts",
    "<rootDir>/apps/desktop/jest.config.ts",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/build/",
    "/coverage/",
    "__tests__",
    "__mocks__",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
  ],
  watchPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/build/",
    "/coverage/",
    "__tests__",
    "__mocks__",
    "**/*.test.ts",
    "**/*.test.tsx",
  ],
}

export default config
