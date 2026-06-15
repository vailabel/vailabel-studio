import { useCallback, useEffect, useState } from "react"
import { listen } from "@tauri-apps/api/event"
import { isDesktopApp } from "@/lib/desktop"
import { listenToStudioEvents } from "@/ipc/events"
import { aiRuntimeService } from "@/services/ai-runtime-service"
import type {
  RuntimeMetrics,
  RuntimeModel,
  RuntimeStatus,
  RuntimeStatusEvent,
  TrainingJob,
} from "@/types/ai-runtime"

const DEFAULT_STATUS: RuntimeStatus = { state: "stopped", restartCount: 0 }

/** Runtime lifecycle + live status/metrics. */
export function useAiRuntimeViewModel() {
  const [status, setStatus] = useState<RuntimeStatus>(DEFAULT_STATUS)
  const [metrics, setMetrics] = useState<RuntimeMetrics | null>(null)
  const [logs, setLogs] = useState<string>("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await aiRuntimeService.status())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  // Live status + metrics from the monitor loop.
  useEffect(() => {
    if (!isDesktopApp()) return
    const unsubscribers: Array<() => void> = []

    void listen<RuntimeStatusEvent>("runtime://status", ({ payload }) => {
      setStatus((prev) => ({
        ...prev,
        state: payload.state,
        lastError: payload.lastError ?? prev.lastError,
        port: payload.port ?? prev.port,
        pid: payload.pid ?? prev.pid,
      }))
    }).then((u) => unsubscribers.push(u))

    void listen<RuntimeMetrics>("runtime://metrics", ({ payload }) => {
      setMetrics(payload)
      setStatus((prev) => ({ ...prev, metrics: payload }))
    }).then((u) => unsubscribers.push(u))

    return () => unsubscribers.forEach((u) => u())
  }, [])

  const run = useCallback(
    async (action: () => Promise<RuntimeStatus>) => {
      setBusy(true)
      setError(null)
      try {
        setStatus(await action())
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    },
    []
  )

  return {
    status,
    metrics,
    logs,
    busy,
    error,
    start: () => run(aiRuntimeService.start),
    stop: () => run(aiRuntimeService.stop),
    restart: () => run(aiRuntimeService.restart),
    refreshStatus,
    loadLogs: async () => {
      try {
        setLogs(await aiRuntimeService.logs())
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
  }
}

/** Model Manager: catalog + installed models, install/delete. */
export function useRuntimeModels() {
  const [models, setModels] = useState<RuntimeModel[]>([])
  const [loading, setLoading] = useState(true)
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setModels(await aiRuntimeService.listModels())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    let unlisten: (() => void) | undefined
    void listenToStudioEvents(() => void load(), ["runtime_model"]).then(
      (u) => (unlisten = u)
    )
    return () => unlisten?.()
  }, [load])

  return {
    models,
    loading,
    installingId,
    error,
    reload: load,
    install: async (id: string) => {
      setInstallingId(id)
      setError(null)
      try {
        await aiRuntimeService.installModel(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setInstallingId(null)
      }
    },
    remove: async (id: string) => {
      try {
        await aiRuntimeService.deleteModel(id)
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
  }
}

/** Training jobs list, refreshed on domain events. */
export function useTrainingJobs() {
  const [jobs, setJobs] = useState<TrainingJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setJobs(await aiRuntimeService.listTraining())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    let unlisten: (() => void) | undefined
    void listenToStudioEvents(() => void load(), ["training_job"]).then(
      (u) => (unlisten = u)
    )
    return () => unlisten?.()
  }, [load])

  return {
    jobs,
    loading,
    error,
    reload: load,
    stop: async (id: string) => {
      try {
        await aiRuntimeService.stopTraining(id)
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
  }
}
