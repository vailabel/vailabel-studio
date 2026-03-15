import { listen } from "@tauri-apps/api/event"
import { listenToStudioEvents } from "@/ipc/events"
import { isDesktopApp } from "@/lib/desktop"

jest.mock("@tauri-apps/api/event", () => ({
  listen: jest.fn(),
}))

jest.mock("@/lib/desktop", () => ({
  isDesktopApp: jest.fn(),
}))

const mockListen = jest.mocked(listen)
const mockIsDesktopApp = jest.mocked(isDesktopApp)

describe("listenToStudioEvents", () => {
  beforeEach(() => {
    mockListen.mockReset()
    mockIsDesktopApp.mockReset()
  })

  it("returns a noop listener outside desktop mode", async () => {
    mockIsDesktopApp.mockReturnValue(false)

    const unlisten = await listenToStudioEvents(jest.fn(), ["annotations"])

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

    const handler = jest.fn()
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
})
