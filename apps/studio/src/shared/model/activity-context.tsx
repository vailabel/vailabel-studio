import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { listen } from "@tauri-apps/api/event"
import { isDesktopApp } from "@/shared/lib/desktop"
import type { Activity } from "@/shared/types/activity"

const ACTIVITY_EVENT = "studio://activity"
/** How long a completed task lingers in the indicator before it auto-clears.
 *  Errors are kept until the user dismisses them. */
const DONE_TTL_MS = 5000

interface ActivityContextValue {
  /** Active + recently-finished tasks, oldest first. */
  activities: Activity[]
  /** Drop a task from the indicator. */
  dismiss: (id: string) => void
}

const ActivityContext = createContext<ActivityContextValue | null>(null)

/**
 * App-level aggregator for the unified `studio://activity` backend channel.
 * Mounted once at the root so progress for any long-running backend task
 * (downloads, installs, video ingest, dataset analysis, training, cloud sync)
 * keeps flowing into one place regardless of which page is open. The global
 * activity indicator renders from this; feature hooks/viewmodels read their own
 * task via {@link useActivityById} / {@link useActivitiesByKind}.
 */
export function ActivityProvider({ children }: { children: ReactNode }) {
  const [byId, setById] = useState<Record<string, Activity>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const clearTimer = useCallback((id: string) => {
    const t = timers.current[id]
    if (t) {
      clearTimeout(t)
      delete timers.current[id]
    }
  }, [])

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id)
      setById((prev) => {
        if (!(id in prev)) return prev
        const next = { ...prev }
        delete next[id]
        return next
      })
    },
    [clearTimer]
  )

  useEffect(() => {
    if (!isDesktopApp()) return
    let unlisten: (() => void) | undefined
    void listen<Activity>(ACTIVITY_EVENT, ({ payload }) => {
      setById((prev) => ({ ...prev, [payload.id]: payload }))
      // Completed tasks fade out on their own; errors stay until dismissed.
      clearTimer(payload.id)
      if (payload.phase === "done") {
        timers.current[payload.id] = setTimeout(() => dismiss(payload.id), DONE_TTL_MS)
      }
    })
      .then((fn) => {
        unlisten = fn
      })
      .catch(() => {
        // No Tauri event stream (e.g. web build) — activity is desktop-only.
      })
    return () => unlisten?.()
  }, [clearTimer, dismiss])

  // Drop any pending auto-dismiss timers when the provider unmounts.
  useEffect(() => {
    const pending = timers.current
    return () => {
      Object.values(pending).forEach(clearTimeout)
    }
  }, [])

  const activities = useMemo(
    () => Object.values(byId).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
    [byId]
  )

  const value = useMemo<ActivityContextValue>(
    () => ({ activities, dismiss }),
    [activities, dismiss]
  )

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
}

export function useActivity(): ActivityContextValue {
  const ctx = useContext(ActivityContext)
  if (!ctx) {
    throw new Error("useActivity must be used within an ActivityProvider")
  }
  return ctx
}

/** The current snapshot for a specific task id, if any. */
export function useActivityById<TData = unknown>(
  id: string
): Activity<TData> | undefined {
  const { activities } = useActivity()
  return activities.find((a) => a.id === id) as Activity<TData> | undefined
}

/** All current snapshots of a given kind, oldest first. */
export function useActivitiesByKind<TData = unknown>(
  kind: string
): Activity<TData>[] {
  const { activities } = useActivity()
  return activities.filter((a) => a.kind === kind) as Activity<TData>[]
}
