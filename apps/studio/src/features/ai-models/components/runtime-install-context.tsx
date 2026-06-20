import { useCallback, useEffect, useState } from "react"
import { aiRuntimeService } from "@/shared/services/ai-runtime-service"
import { useActivity, useActivityById } from "@/shared/model/activity-context"

/**
 * First-run AI-runtime install, surfaced over the unified `studio://activity`
 * channel (id `"runtime-install"`). The embedded Python interpreter (~1.5 GB) is
 * downloaded into app-data on demand rather than bundled; the global activity
 * indicator shows the live download/extract/pip progress for the whole session.
 * This hook tracks whether it's installed and exposes the `start` action; the AI
 * page just calls `start`.
 */
export function useRuntimeInstall() {
  const { dismiss } = useActivity()
  const activity = useActivityById("runtime-install")
  /** Whether the interpreter is provisioned. `null` while still checking (or
   *  when not running under Tauri). */
  const [installed, setInstalled] = useState<boolean | null>(null)

  const refresh = useCallback(async () => {
    try {
      const status = await aiRuntimeService.installStatus()
      setInstalled(status.installed)
    } catch {
      // Not running under Tauri (e.g. web build) — leave `installed` null.
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Reflect a completed install without waiting for the next status refresh.
  useEffect(() => {
    if (activity?.phase === "done") setInstalled(true)
  }, [activity?.phase])

  const start = useCallback(() => {
    // Resolves only once the whole download + pip + start completes; the
    // activity events drive the indicator in the meantime.
    void aiRuntimeService
      .install()
      .then(() => setInstalled(true))
      .catch(() => {
        // The error surfaces via the activity stream (phase "error").
      })
  }, [])

  return {
    installed,
    active: activity?.phase === "active",
    done: activity?.phase === "done",
    error: activity?.phase === "error" ? activity.message : null,
    message: activity?.message ?? "",
    percent: activity?.percent != null ? Math.round(activity.percent) : null,
    start,
    dismiss: () => dismiss("runtime-install"),
    refresh,
  }
}
