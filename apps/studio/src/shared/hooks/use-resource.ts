import { useCallback, useEffect, useRef, useState } from "react"
import type { StudioDomainEvent } from "@/shared/types/core"
import { useStudioEvents } from "./use-app-event"

/** Window in which a burst of domain events collapses into one reload. */
const INVALIDATION_DEBOUNCE_MS = 50

export interface ResourceOptions<T> {
  /** Value exposed until the first load resolves. */
  initialData: T
  /** Domain entities whose change events trigger a reload. */
  invalidateOn?: readonly string[]
  /** Return false to ignore a domain event (e.g. another project's). */
  shouldInvalidate?: (event: StudioDomainEvent) => boolean
  /** Set false to skip loading (e.g. a required id is missing). */
  enabled?: boolean
}

export interface Resource<T> {
  data: T
  /** True while the current load (initial, reload or after a key change) runs. */
  isLoading: boolean
  /** Error of the latest settled load; null while loading or on success. */
  error: unknown
  /** Re-run the loader. Resolves once that run has settled. */
  reload: () => Promise<void>
  /** Patch the loaded data locally (optimistic / post-mutation updates). */
  mutate: (updater: (current: T) => T) => void
}

interface Settled<T> {
  loader: unknown
  version: number
  data: T
  error: unknown
}

/**
 * The one way view models load data: runs `loader`, tracks loading/error,
 * drops stale responses, and reloads when the backend reports a change.
 *
 * `loader` identity is the cache key — wrap it in `useCallback` with the ids it
 * depends on, and the resource reloads when they change.
 */
export function useResource<T>(
  loader: () => Promise<T>,
  options: ResourceOptions<T>
): Resource<T> {
  const { initialData, invalidateOn, shouldInvalidate, enabled = true } = options

  const [version, setVersion] = useState(0)
  const [settled, setSettled] = useState<Settled<T>>({
    loader: null,
    version: -1,
    data: initialData,
    error: null,
  })
  const waiters = useRef<Array<() => void>>([])
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Loading is derived, not stored: the request in flight is the one whose
  // (loader, version) has not settled yet.
  const isLoading =
    enabled && (settled.loader !== loader || settled.version !== version)

  useEffect(() => {
    if (!enabled) return
    let stale = false

    const settle = (next: (previous: Settled<T>) => Settled<T>) => {
      if (stale) return
      setSettled(next)
      for (const resolve of waiters.current.splice(0)) resolve()
    }

    loader().then(
      (data) => settle(() => ({ loader, version, data, error: null })),
      (error) => settle((previous) => ({ ...previous, loader, version, error }))
    )

    return () => {
      stale = true
    }
  }, [loader, version, enabled])

  useEffect(
    () => () => {
      clearTimeout(debounce.current)
      // Never leave an awaited reload() hanging after unmount.
      for (const resolve of waiters.current.splice(0)) resolve()
    },
    []
  )

  const reload = useCallback(
    () =>
      enabled
        ? new Promise<void>((resolve) => {
            waiters.current.push(resolve)
            setVersion((current) => current + 1)
          })
        : Promise.resolve(),
    [enabled]
  )

  const mutate = useCallback((updater: (current: T) => T) => {
    setSettled((previous) => ({ ...previous, data: updater(previous.data) }))
  }, [])

  useStudioEvents(
    invalidateOn ?? [],
    (event) => {
      if (shouldInvalidate && !shouldInvalidate(event)) return
      clearTimeout(debounce.current)
      debounce.current = setTimeout(
        () => setVersion((current) => current + 1),
        INVALIDATION_DEBOUNCE_MS
      )
    },
    enabled && Boolean(invalidateOn?.length)
  )

  return {
    data: settled.data,
    isLoading,
    error: isLoading ? null : settled.error,
    reload,
    mutate,
  }
}
