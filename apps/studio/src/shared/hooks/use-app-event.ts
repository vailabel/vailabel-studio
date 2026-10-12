import { useEffect, useEffectEvent } from "react"
import { listenToAppEvent, listenToStudioEvents } from "@/shared/ipc/events"
import type { StudioDomainEvent } from "@/shared/types/core"

// Registration is async, so the component can unmount before the listener
// exists. Track disposal and release the listener as soon as it arrives —
// otherwise it leaks for the lifetime of the window.
function subscribe(register: () => Promise<() => void>) {
  let disposed = false
  let unlisten: (() => void) | undefined

  void register().then((release) => {
    if (disposed) release()
    else unlisten = release
  })

  return () => {
    disposed = true
    unlisten?.()
  }
}

/**
 * Run `handler` for every `event` the backend emits while mounted. The handler
 * always sees the latest props/state and never causes a re-subscribe.
 */
export function useAppEvent<T>(
  event: string,
  handler: (payload: T) => void,
  enabled = true
) {
  const onEvent = useEffectEvent(handler)

  useEffect(() => {
    if (!enabled) return
    return subscribe(() =>
      listenToAppEvent<T>(event, (payload) => onEvent(payload))
    )
  }, [event, enabled])
}

/**
 * Run `handler` for domain events (entity saved / deleted) of the given
 * entities. Pass the entities inline — the subscription is keyed by value.
 */
export function useStudioEvents(
  entities: readonly string[],
  handler: (event: StudioDomainEvent) => void,
  enabled = true
) {
  const onEvent = useEffectEvent(handler)
  const entityKey = entities.join(",")

  useEffect(() => {
    if (!enabled) return
    return subscribe(() =>
      listenToStudioEvents(
        (event) => onEvent(event),
        entityKey ? entityKey.split(",") : undefined
      )
    )
  }, [entityKey, enabled])
}
