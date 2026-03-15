import { invoke } from "@tauri-apps/api/core"
import { invokeWithLogging, REDACTED_RESPONSE } from "@/ipc/invoke"

jest.mock("@tauri-apps/api/core", () => ({
  invoke: jest.fn(),
}))

const mockInvoke = jest.mocked(invoke)

describe("invokeWithLogging", () => {
  const logSpy = jest.spyOn(console, "log").mockImplementation(() => {})
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})

  beforeEach(() => {
    mockInvoke.mockReset()
    logSpy.mockClear()
    errorSpy.mockClear()
  })

  afterAll(() => {
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it("logs the Rust IPC response for regular commands", async () => {
    mockInvoke.mockResolvedValue({ success: true })

    const response = await invokeWithLogging("projects_delete", {
      payload: { id: "project-1" },
    })

    expect(response).toEqual({ success: true })
    expect(logSpy).toHaveBeenCalledWith("[rust-ipc]", "projects_delete", {
      success: true,
    })
  })

  it("redacts sensitive Rust IPC responses", async () => {
    mockInvoke.mockResolvedValue("super-secret-token")

    const response = await invokeWithLogging("secret_get", {
      payload: { namespace: "cloud", key: "apiKey" },
    })

    expect(response).toBe("super-secret-token")
    expect(logSpy).toHaveBeenCalledWith(
      "[rust-ipc]",
      "secret_get",
      REDACTED_RESPONSE
    )
  })

  it("logs Rust IPC failures before rethrowing", async () => {
    const error = new Error("ipc failed")
    mockInvoke.mockRejectedValue(error)

    await expect(invokeWithLogging("projects_list")).rejects.toThrow("ipc failed")
    expect(errorSpy).toHaveBeenCalledWith("[rust-ipc]", "projects_list", error)
  })
})
