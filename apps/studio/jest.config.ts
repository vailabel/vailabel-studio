import type { Config } from "jest"

const config: Config = {
  displayName: "studio",
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testMatch: ["**/__tests__/**/*.test.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  moduleNameMapper: {
    "\\.(css|less|scss)$": "identity-obj-proxy",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@vailabel/core(.*)$": "<rootDir>/../core/src$1",
  },
  // Add src/types to moduleDirectories so Jest picks up global type definitions
  moduleDirectories: ["node_modules", "src/types", "src"],
}

export default config
