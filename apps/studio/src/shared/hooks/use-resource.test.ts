import { act, renderHook, waitFor } from "@testing-library/react"
import { listenToStudioEvents } from "@/shared/ipc/events"
import type { StudioDomainEvent } from "@/shared/types/core"
import { useResource } from "./use-resource"

vi.mock("@/shared/ipc/events", () => ({
  listenToStudioEvents: vi.fn(),
}))

const mockListen = vi.mocked(listenToStudioEvents)

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const domainEvent = (overrides: Partial<StudioDomainEvent> = {}) =>
  ({
    entity: "projects",
    action: "saved",
    id: "1",
    occurredAt: "",
    ...overrides,
  }) as StudioDomainEvent

describe("useResource", () => {
  let emit: (event: StudioDomainEvent) => void
  const unlisten = vi.fn()

  beforeEach(() => {
    unlisten.mockReset()
    mockListen.mockReset()
    mockListen.mockImplementation(async (handler) => {
      emit = handler
      return unlisten
    })
  })

  it("exposes initial data while loading, then the loaded value", async () => {
    const loader = vi.fn().mockResolvedValue(["a"])
    const { result } = renderHook(() =>
      useResource<string[]>(loader, { initialData: [] })
    )

    expect(result.current).toMatchObject({ data: [], isLoading: true })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current).toMatchObject({ data: ["a"], error: null })
  })

  it("keeps the last data and surfaces the error when a load fails", async () => {
    const failure = new Error("boom")
    const loader = vi
      .fn()
      .mockResolvedValueOnce(["a"])
      .mockRejectedValueOnce(failure)
    const { result } = renderHook(() =>
      useResource<string[]>(loader, { initialData: [] })
    )
    await waitFor(() => expect(result.current.data).toEqual(["a"]))

    // Start the reload in one act (flushes the render that kicks off the
    // load), then await it in another.
    let reloading!: Promise<void>
    act(() => {
      reloading = result.current.reload()
    })
    await act(() => reloading)

    expect(result.current).toMatchObject({
      data: ["a"],
      error: failure,
      isLoading: false,
    })
  })

  it("ignores a stale response when the loader changes mid-flight", async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const loaders = { a: () => first.promise, b: () => second.promise }
    const { result, rerender } = renderHook(
      ({ id }: { id: "a" | "b" }) =>
        useResource(loaders[id], { initialData: "" }),
      { initialProps: { id: "a" } }
    )

    rerender({ id: "b" })
    await act(async () => {
      second.resolve("fresh")
      first.resolve("stale")
    })

    expect(result.current.data).toBe("fresh")
    expect(result.current.isLoading).toBe(false)
  })

  it("does not load while disabled", () => {
    const loader = vi.fn().mockResolvedValue("x")
    const { result } = renderHook(() =>
      useResource(loader, { initialData: "", enabled: false })
    )

    expect(loader).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

  it("patches data locally with mutate", async () => {
    const loader = vi.fn().mockResolvedValue([1])
    const { result } = renderHook(() =>
      useResource<number[]>(loader, { initialData: [] })
    )
    await waitFor(() => expect(result.current.data).toEqual([1]))

    act(() => result.current.mutate((current) => [...current, 2]))

    expect(result.current.data).toEqual([1, 2])
    expect(loader).toHaveBeenCalledTimes(1)
  })

  describe("domain-event invalidation", () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    const renderInvalidating = (
      shouldInvalidate?: (event: StudioDomainEvent) => boolean
    ) => {
      const loader = vi.fn().mockResolvedValue("x")
      const view = renderHook(() =>
        useResource(loader, {
          initialData: "",
          invalidateOn: ["projects"],
          shouldInvalidate,
        })
      )
      return { loader, ...view }
    }

    it("collapses a burst of events into a single reload", async () => {
      const { loader } = renderInvalidating()
      await act(() => vi.runAllTimersAsync())
      expect(loader).toHaveBeenCalledTimes(1)
      expect(mockListen).toHaveBeenCalledWith(expect.any(Function), ["projects"])

      await act(async () => {
        emit(domainEvent())
        emit(domainEvent())
        emit(domainEvent())
        await vi.runAllTimersAsync()
      })

      expect(loader).toHaveBeenCalledTimes(2)
    })

    it("skips events rejected by shouldInvalidate", async () => {
      const { loader } = renderInvalidating(
        (event) => event.projectId === "mine"
      )
      await act(() => vi.runAllTimersAsync())

      await act(async () => {
        emit(domainEvent({ projectId: "other" }))
        await vi.runAllTimersAsync()
      })

      expect(loader).toHaveBeenCalledTimes(1)
    })

    it("releases the listener on unmount", async () => {
      const { unmount } = renderInvalidating()
      await act(() => vi.runAllTimersAsync())

      unmount()

      expect(unlisten).toHaveBeenCalledTimes(1)
    })
  })
})
