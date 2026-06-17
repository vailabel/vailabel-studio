import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { listen } from "@tauri-apps/api/event"
import { aiRuntimeService } from "@/shared/services/ai-runtime-service"
import type { GpuInstallProgress } from "@/shared/types/ai-runtime"

interface GpuInstallState {
  /** A CUDA-torch install is in flight. */
  active: boolean
  /** Finished successfully; awaiting an app restart to activate. */
  done: boolean
  error: string | null
  message: string
  /** 0–100, or null while indeterminate (before the download starts). */
  percent: number | null
  gpuName: string | null
}

interface GpuInstallContextValue extends GpuInstallState {
  start: (opts: { tag?: string; gpuName?: string | null }) => void
  dismiss: () => void
  restartApp: () => void
}

const INITIAL: GpuInstallState = {
  active: false,
  done: false,
  error: null,
  message: "",
  percent: null,
  gpuName: null,
}

const GpuInstallContext = createContext<GpuInstallContextValue | null>(null)

/**
 * App-level owner of the GPU (CUDA PyTorch) install. Mounted at the app root and
 * listens to `runtime-gpu-install://progress` for the whole session, so progress
 * keeps flowing even after the user navigates away from the AI Assistant page —
 * the ~2 GB download runs in the Rust backend regardless. A floating indicator
 * renders from this state; the AI page just calls `start`.
 */
export function GpuInstallProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GpuInstallState>(INITIAL)

  useEffect(() => {
    let unlisten: (() => void) | undefined
    void listen<GpuInstallProgress>("runtime-gpu-install://progress", (event) => {
      const payload = event.payload
      setState((prev) => {
        if (payload.phase === "error") {
          return { ...prev, active: false, done: false, error: payload.message }
        }
        if (payload.phase === "done") {
          return {
            ...prev,
            active: false,
            done: true,
            error: null,
            message: payload.message,
            percent: 100,
          }
        }
        const percent =
          payload.totalBytes && payload.totalBytes > 0
            ? Math.min(
                100,
                Math.round(((payload.receivedBytes ?? 0) / payload.totalBytes) * 100)
              )
            : prev.percent
        return {
          ...prev,
          active: true,
          done: false,
          error: null,
          message: payload.message,
          percent,
        }
      })
    })
      .then((fn) => {
        unlisten = fn
      })
      .catch(() => {
        // No Tauri event stream (e.g. web build) — the install is desktop-only.
      })
    return () => unlisten?.()
  }, [])

  const start = useCallback(
    ({ tag, gpuName }: { tag?: string; gpuName?: string | null }) => {
      setState({
        active: true,
        done: false,
        error: null,
        message: "Starting…",
        percent: null,
        gpuName: gpuName ?? null,
      })
      void aiRuntimeService.enableGpu(tag).catch((error) => {
        setState((prev) => ({
          ...prev,
          active: false,
          error: error instanceof Error ? error.message : String(error),
        }))
      })
    },
    []
  )

  const dismiss = useCallback(
    () => setState((prev) => ({ ...prev, done: false, error: null })),
    []
  )

  const restartApp = useCallback(() => {
    void aiRuntimeService.restartApp()
  }, [])

  return (
    <GpuInstallContext.Provider value={{ ...state, start, dismiss, restartApp }}>
      {children}
    </GpuInstallContext.Provider>
  )
}

export function useGpuInstall(): GpuInstallContextValue {
  const ctx = useContext(GpuInstallContext)
  if (!ctx) {
    throw new Error("useGpuInstall must be used within a GpuInstallProvider")
  }
  return ctx
}
