import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import type { StudioDomainEvent } from "@/types/core"
import { isDesktopApp } from "@/lib/desktop"

export async function listenToStudioEvents(
  handler: (event: StudioDomainEvent) => void,
  entities?: string[]
): Promise<UnlistenFn> {
  if (!isDesktopApp()) {
    return async () => {}
  }

  try {
    return await listen<StudioDomainEvent>("studio://domain-event", ({ payload }) => {
      if (entities?.length && !entities.includes(payload.entity)) {
        return
      }
      handler(payload)
    })
  } catch (error) {
    console.warn("Failed to register studio event listener:", error)
    return async () => {}
  }
}

