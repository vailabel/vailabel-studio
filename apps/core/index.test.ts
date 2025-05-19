import { describe, it, expect } from "@jest/globals"
import * as coreIndex from "./src/index"

describe("core index exports", () => {
  it("should export something", () => {
    expect(coreIndex).toBeDefined()
  })
})
