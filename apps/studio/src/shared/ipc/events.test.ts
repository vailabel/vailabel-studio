import { listen } from "@tauri-apps/api/event"
import { listenToStudioEvents } from "@/shared/ipc/events"
import { isDesktopApp } from "@/shared/lib/desktop"

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}))

vi.mock("@/shared/lib/desktop", () => ({
  isDesktopApp: vi.fn(),
}))

const mockListen = vi.mocked(listen)
const mockIsDesktopApp = vi.mocked(isDesktopApp)

describe("listenToStudioEvents", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

  beforeEach(() => {
    mockListen.mockReset()
    mockIsDesktopApp.mockReset()
    warnSpy.mockClear()
  })

  afterAll(() => {
    warnSpy.mockRestore()
  })

  it("returns a noop listener outside desktop mode", async () => {
    mockIsDesktopApp.mockReturnValue(false)

    const unlisten = await listenToStudioEvents(vi.fn(), ["annotations"])

    expect(mockListen).not.toHaveBeenCalled()
    await expect(unlisten()).resolves.toBeUndefined()
  })

  it("filters events by entity before calling the handler", async () => {
    mockIsDesktopApp.mockReturnValue(true)

    let listener:
      | ((event: {
          payload: {
            entity: string
            action: string
            id: string
            occurredAt: string
          }
        }) => void)
      | undefined

    mockListen.mockImplementation(async (_event, callback) => {
      listener = callback as typeof listener
      return async () => {}
    })

    const handler = vi.fn()
    await listenToStudioEvents(handler, ["annotations"])

    listener?.({
      payload: {
        entity: "predictions",
        action: "generated",
        id: "image-1",
        occurredAt: "2026-03-14T00:00:00Z",
      },
    })
    listener?.({
      payload: {
        entity: "annotations",
        action: "created",
        id: "annotation-1",
        occurredAt: "2026-03-14T00:00:00Z",
      },
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "annotations",
        action: "created",
        id: "annotation-1",
      })
    )
  })

  it("returns a noop listener when Tauri denies event subscriptions", async () => {
    mockIsDesktopApp.mockReturnValue(true)
    const error = new Error("event.listen not allowed")
    mockListen.mockRejectedValue(error)

    const unlisten = await listenToStudioEvents(vi.fn(), ["annotations"])

    expect(warnSpy).toHaveBeenCalledWith(
      "Failed to register studio event listener:",
      error
    )
    await expect(unlisten()).resolves.toBeUndefined()
  })
})
