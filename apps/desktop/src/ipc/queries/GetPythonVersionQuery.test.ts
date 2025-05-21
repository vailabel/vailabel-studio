import { GetPythonVersionQuery } from "./GetPythonVersionQuery"
import { execSync } from "child_process"

describe("GetPythonVersionQuery", () => {
  let query: GetPythonVersionQuery

  beforeEach(() => {
    query = new GetPythonVersionQuery()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("handle", () => {
    it("should call execSync and return mocked values", async () => {
      const pythonPath = "/usr/bin/python3"
      const execSyncMock = jest
        .spyOn(require("child_process"), "execSync")
        .mockReturnValue(Buffer.from("mocked"))
      const result = await query.handle({} as any, { pythonPath })
      expect(execSyncMock).toHaveBeenCalled()
      expect(result.pythonPath).toBe(pythonPath)
    })

    it("should call getPythonPath if pythonPath is not provided", async () => {
      const getPythonPathSpy = jest
        .spyOn(query as any, "getPythonPath")
        .mockReturnValue({
          pythonPath: "mocked",
          version: "mocked",
          pipVersion: "mocked",
        })
      const result = await query.handle({} as any, { pythonPath: "" })
      expect(getPythonPathSpy).toHaveBeenCalled()
      expect(result.pythonPath).toBe("mocked")
    })
  })

  describe("getPythonPath", () => {
    it("should call execSync and return mocked values", () => {
      const execSyncMock = jest
        .spyOn(require("child_process"), "execSync")
        .mockReturnValue(Buffer.from("mocked"))
      const result = (query as any).getPythonPath()
      expect(execSyncMock).toHaveBeenCalled()
      expect(result.pythonPath).toBe("mocked")
    })
  })
})
