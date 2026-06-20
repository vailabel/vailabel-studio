import { useCallback } from "react"
import { aiRuntimeService } from "@/shared/services/ai-runtime-service"
import { useActivity, useActivityById } from "@/shared/model/activity-context"

/**
 * GPU (CUDA PyTorch) install, surfaced over the unified `studio://activity`
 * channel (id `"gpu-install"`). The ~2 GB download runs in the Rust backend and
 * its progress shows in the global activity indicator for the whole session; on
 * completion the indicator offers the required app restart. The AI page just
 * calls `start`.
 */
export function useGpuInstall() {
  const { dismiss } = useActivity()
  const activity = useActivityById("gpu-install")

  const start = useCallback((opts: { tag?: string; gpuName?: string | null }) => {
    void aiRuntimeService.enableGpu(opts.tag).catch(() => {
      // The error surfaces via the activity stream (phase "error").
    })
  }, [])

  const restartApp = useCallback(() => {
    void aiRuntimeService.restartApp()
  }, [])

  return {
    active: activity?.phase === "active",
    done: activity?.phase === "done",
    error: activity?.phase === "error" ? activity.message : null,
    message: activity?.message ?? "",
    percent: activity?.percent != null ? Math.round(activity.percent) : null,
    start,
    dismiss: () => dismiss("gpu-install"),
    restartApp,
  }
}
