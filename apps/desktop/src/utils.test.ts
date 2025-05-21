import path from "path"
import * as utils from "./utils"

jest.mock("electron", () => ({
  app: {
    get isPackaged() {
      return mockIsPackaged
    },
  },
}))

let mockIsPackaged = false

beforeAll(() => {
  if (!process.resourcesPath) {
    // @ts-ignore
    process.resourcesPath = "/mock/resources/path"
  }
})

describe("utils", () => {
  describe("resolveResource", () => {
    afterEach(() => {
      mockIsPackaged = false
    })
    it("should resolve path in development mode", () => {
      mockIsPackaged = false
      const result = utils.resolveResource("test/file.txt")
      expect(result).toBe(path.join(__dirname, "..", "test/file.txt"))
    })

    it("should resolve path in production mode", () => {
      mockIsPackaged = true
      const result = utils.resolveResource("test/file.txt")
      expect(result).toBe(path.join(process.resourcesPath, "test/file.txt"))
    })
  })
})
