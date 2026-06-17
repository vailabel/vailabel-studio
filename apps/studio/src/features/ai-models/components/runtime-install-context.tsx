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
import type { RuntimeInstallProgress } from "@/shared/types/ai-runtime"

interface RuntimeInstallState {
  /** Whether the embedded interpreter is provisioned. `null` while we're still
   *  checking (or when not running under Tauri). */
  installed: boolean | null
  /** A download/install is in flight. */
  active: boolean
  /** Finished successfully this session. */
  done: boolean
  error: string | null
  message: string
  /** 0–100, or null while indeterminate (extract / pip phases). */
  percent: number | null
}

interface RuntimeInstallContextValue extends RuntimeInstallState {
  start: () => void
  dismiss: () => void
  refresh: () => Promise<void>
}

const INITIAL: RuntimeInstallState = {
  installed: null,
  active: false,
  done: false,
  error: null,
  message: "",
  percent: null,
}

const RuntimeInstallContext = createContext<RuntimeInstallContextValue | null>(
  null
)

/**
 * App-level owner of the first-run AI-runtime install. The embedded Python
 * interpreter (~1.5 GB) is downloaded into app-data on demand rather than
 * bundled, so this provider listens to `runtime-install://progress` for the
 * whole session — progress keeps flowing even if the user navigates away from
 * the AI page while the download runs in the Rust backend. A floating indicator
 * renders from this state; the AI page just calls `start`.
 */
export function RuntimeInstallProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RuntimeInstallState>(INITIAL)

  const refresh = useCallback(async () => {
    try {
      const status = await aiRuntimeService.installStatus()
      setState((prev) => ({ ...prev, installed: status.installed }))
    } catch {
      // Not running under Tauri (e.g. web build) — leave `installed` null.
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    void listen<RuntimeInstallProgress>("runtime-install://progress", (event) => {
      const payload = event.payload
      setState((prev) => {
        if (payload.phase === "error") {
          return { ...prev, active: false, done: false, error: payload.message }
        }
        if (payload.phase === "done") {
          return {
            ...prev,
            installed: true,
            active: false,
            done: true,
            error: null,
            message: payload.message,
            percent: 100,
          }
        }
        // Byte progress is only meaningful during the download phase; the
        // extract / pip phases are indeterminate.
        const percent =
          payload.phase === "downloading" &&
          payload.totalBytes &&
          payload.totalBytes > 0
            ? Math.min(
                100,
                Math.round(((payload.receivedBytes ?? 0) / payload.totalBytes) * 100)
              )
            : null
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

  const start = useCallback(() => {
    setState((prev) => ({
      ...prev,
      active: true,
      done: false,
      error: null,
      message: "Starting…",
      percent: null,
    }))
    // Resolves only once the whole download + pip + start completes; the
    // progress events above drive the UI in the meantime.
    void aiRuntimeService
      .install()
      .then(() =>
        setState((prev) => ({
          ...prev,
          installed: true,
          active: false,
          done: true,
        }))
      )
      .catch((error) => {
        setState((prev) => ({
          ...prev,
          active: false,
          error: error instanceof Error ? error.message : String(error),
        }))
      })
  }, [])

  const dismiss = useCallback(
    () => setState((prev) => ({ ...prev, done: false, error: null })),
    []
  )

  return (
    <RuntimeInstallContext.Provider
      value={{ ...state, start, dismiss, refresh }}
    >
      {children}
    </RuntimeInstallContext.Provider>
  )
}

export function useRuntimeInstall(): RuntimeInstallContextValue {
  const ctx = useContext(RuntimeInstallContext)
  if (!ctx) {
    throw new Error(
      "useRuntimeInstall must be used within a RuntimeInstallProvider"
    )
  }
  return ctx
}
