import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import type { StudioDomainEvent } from "@/shared/types/core"
import { isDesktopApp } from "@/shared/lib/desktop"

export type { UnlistenFn }

const STUDIO_DOMAIN_EVENT = "studio://domain-event"
const noopUnlisten: UnlistenFn = async () => {}

/**
 * Subscribe to a raw backend event. This is the only place the app touches the
 * Tauri event API: it is a no-op off desktop (web build, tests) and never
 * rejects, so callers don't each need their own guard.
 */
export async function listenToAppEvent<T>(
  event: string,
  handler: (payload: T) => void
): Promise<UnlistenFn> {
  if (!isDesktopApp()) {
    return noopUnlisten
  }

  try {
    return await listen<T>(event, ({ payload }) => handler(payload))
  } catch (error) {
    console.warn(`Failed to register "${event}" listener:`, error)
    return noopUnlisten
  }
}

export function listenToStudioEvents(
  handler: (event: StudioDomainEvent) => void,
  entities?: readonly string[]
): Promise<UnlistenFn> {
  return listenToAppEvent<StudioDomainEvent>(STUDIO_DOMAIN_EVENT, (payload) => {
    if (entities?.length && !entities.includes(payload.entity)) {
      return
    }
    handler(payload)
  })
}
