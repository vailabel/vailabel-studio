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
  ],
  watchPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/build/",
    "/coverage/",
  ],
}

export default config
