import { useCallback, useEffect, useRef, useState } from "react"
import { isDesktopApp } from "@/shared/lib/desktop"

interface UpdateProgress {
  percent: number
  transferred: number
  total: number
}

interface UpdateAvailable {
  version?: string
  notes?: string
}

export interface AutoUpdate {
  /** Set once a newer release is found (cleared when up to date). */
  updateAvailable: UpdateAvailable | null
  /** Download progress while installing; null when not downloading. */
  progress: UpdateProgress | null
  /** True once the update is downloaded + staged, awaiting relaunch. */
  updateDownloaded: boolean
  /** True while a check is in flight. */
  checking: boolean
  /** Last error message from a check/install, if any. */
  error: string | null
  /** True after a check that found no newer version. */
  upToDate: boolean
  /** Query the GitHub endpoint for a newer release (startup + manual button). */
  checkForUpdates: () => Promise<void>
  /** Download + stage the pending update, reporting progress. */
  installUpdate: () => Promise<void>
  /** Relaunch into the freshly-installed version. */
  relaunchApp: () => Promise<void>
}

/**
 * Drives the Tauri updater (GitHub Releases). The plugin modules are imported
 * lazily and behind `isDesktopApp()` so the web build never pulls them in.
 */
export const useAutoUpdate = (): AutoUpdate => {
  const [updateAvailable, setUpdateAvailable] =
    useState<UpdateAvailable | null>(null)
  const [progress, setProgress] = useState<UpdateProgress | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [upToDate, setUpToDate] = useState(false)
  // Holds the Update handle returned by check() so installUpdate() can use it.
  const updateRef = useRef<unknown>(null)

  const checkForUpdates = useCallback(async () => {
    if (!isDesktopApp()) return
    setChecking(true)
    setError(null)
    setUpToDate(false)
    try {
      const { check } = await import("@tauri-apps/plugin-updater")
      const update = await check()
      if (update) {
        updateRef.current = update
        setUpdateAvailable({ version: update.version, notes: update.body })
        setProgress(null)
        setUpdateDownloaded(false)
      } else {
        updateRef.current = null
        setUpdateAvailable(null)
        setUpToDate(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setChecking(false)
    }
  }, [])

  const installUpdate = useCallback(async () => {
    const update = updateRef.current as
      | {
          downloadAndInstall: (
            onEvent: (event: {
              event: string
              data?: { contentLength?: number; chunkLength?: number }
            }) => void
          ) => Promise<void>
        }
      | null
    if (!update) return
    setError(null)
    let total = 0
    let transferred = 0
    setProgress({ percent: 0, transferred: 0, total: 0 })
    try {
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data?.contentLength ?? 0
            setProgress({ percent: 0, transferred: 0, total })
            break
          case "Progress":
            transferred += event.data?.chunkLength ?? 0
            setProgress({
              percent: total > 0 ? (transferred / total) * 100 : 0,
              transferred,
              total,
            })
            break
          case "Finished":
            setProgress({ percent: 100, transferred: total, total })
            break
        }
      })
      setProgress(null)
      setUpdateDownloaded(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setProgress(null)
    }
  }, [])

  const relaunchApp = useCallback(async () => {
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process")
      await relaunch()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  // Auto-check once on startup.
  useEffect(() => {
    if (!isDesktopApp()) return
    void checkForUpdates()
  }, [checkForUpdates])

  return {
    updateAvailable,
    progress,
    updateDownloaded,
    checking,
    error,
    upToDate,
    checkForUpdates,
    installUpdate,
    relaunchApp,
  }
}
