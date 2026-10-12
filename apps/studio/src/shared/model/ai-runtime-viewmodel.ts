import { useCallback, useEffect, useRef, useState } from "react"
import { isDesktopApp } from "@/shared/lib/desktop"
import { useAppEvent } from "@/shared/hooks/use-app-event"
import { useResource } from "@/shared/hooks/use-resource"
import { aiRuntimeService } from "@/shared/services/ai-runtime-service"
import type {
  DatasetExportResult,
  RuntimeMetrics,
  RuntimeModel,
  RuntimeStatus,
  RuntimeStatusEvent,
  TrainingJob,
  TrainingReport,
} from "@/shared/types/ai-runtime"
import { toErrorMessage } from "@/shared/lib/errors"

const DEFAULT_STATUS: RuntimeStatus = { state: "stopped", restartCount: 0 }

const loadStatus = () => aiRuntimeService.status()

/** Runtime lifecycle + live status/metrics. */
export function useAiRuntimeViewModel() {
  const {
    data: status,
    error: statusError,
    reload: refreshStatus,
    mutate: setStatus,
  } = useResource(loadStatus, { initialData: DEFAULT_STATUS })
  const [metrics, setMetrics] = useState<RuntimeMetrics | null>(null)
  const [logs, setLogs] = useState<string>("")
  const [busy, setBusy] = useState(false)
  const [actionError, setError] = useState<string | null>(null)
  const error = actionError ?? (statusError ? toErrorMessage(statusError) : null)

  // Live status + metrics from the monitor loop.
  useAppEvent<RuntimeStatusEvent>("runtime://status", (payload) => {
    setStatus((prev) => ({
      ...prev,
      state: payload.state,
      lastError: payload.lastError ?? prev.lastError,
      port: payload.port ?? prev.port,
      pid: payload.pid ?? prev.pid,
    }))
  })
  useAppEvent<RuntimeMetrics>("runtime://metrics", (payload) => {
    setMetrics(payload)
    setStatus((prev) => ({ ...prev, metrics: payload }))
  })

  const run = useCallback(
    async (action: () => Promise<RuntimeStatus>) => {
      setBusy(true)
      setError(null)
      try {
        const next = await action()
        setStatus(() => next)
      } catch (e) {
        setError(toErrorMessage(e))
      } finally {
        setBusy(false)
      }
    },
    [setStatus]
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
        setError(toErrorMessage(e))
      }
    },
  }
}

const NO_MODELS: RuntimeModel[] = []
const loadRuntimeModels = () => aiRuntimeService.listModels()

/** Model Manager: catalog + installed models, install/delete. */
export function useRuntimeModels() {
  const {
    data: models,
    isLoading: loading,
    error: loadError,
    reload: load,
  } = useResource(loadRuntimeModels, {
    initialData: NO_MODELS,
    invalidateOn: ["runtime_model"],
  })
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [actionError, setError] = useState<string | null>(null)
  const error = actionError ?? (loadError ? toErrorMessage(loadError) : null)

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
        setError(toErrorMessage(e))
      } finally {
        setInstallingId(null)
      }
    },
    remove: async (id: string) => {
      try {
        await aiRuntimeService.deleteModel(id)
        await load()
      } catch (e) {
        setError(toErrorMessage(e))
      }
    },
  }
}

const NO_JOBS: TrainingJob[] = []
const loadTrainingJobs = () => aiRuntimeService.listTraining()

/** Training jobs list, refreshed on domain events. */
export function useTrainingJobs() {
  const {
    data: jobs,
    isLoading: loading,
    error: loadError,
    reload: load,
  } = useResource(loadTrainingJobs, {
    initialData: NO_JOBS,
    invalidateOn: ["training_job"],
  })
  const [actionError, setError] = useState<string | null>(null)
  const error = actionError ?? (loadError ? toErrorMessage(loadError) : null)

  // The runtime owns live progress; poll it to sync (status/metrics/terminal)
  // back into the stored runs while a job is in flight, then stop polling.
  const hasActive = jobs.some(
    (j) => j.status === "running" || j.status === "pending"
  )
  useEffect(() => {
    if (!isDesktopApp() || !hasActive) return
    const id = setInterval(() => {
      void aiRuntimeService
        .syncTraining()
        .then((changed) => {
          if (changed.length > 0) void load()
        })
        .catch(() => {})
    }, 2000)
    return () => clearInterval(id)
  }, [hasActive, load])

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
        setError(toErrorMessage(e))
      }
    },
  }
}

/** Tail a training job's log via incremental offset polling. The runtime's
 * `/training/logs` endpoint seeks to a byte offset and returns only the lines
 * written since — so we accumulate them and advance `next_offset` each tick.
 * Streams every second while the job is active; a terminal job is fetched once
 * (re-running active→terminal catches the final lines, then the interval stops).
 * Returns the accumulated lines. */
export function useTrainingLogStream(jobId: string | null, isActive: boolean) {
  const [lines, setLines] = useState<string[]>([])
  const [trackedJob, setTrackedJob] = useState<string | null>(jobId)
  const offsetRef = useRef(0)

  // Clear accumulated lines when the watched job changes — React's render-phase
  // "adjust state on prop change" pattern, so it settles before the poll effect.
  if (jobId !== trackedJob) {
    setTrackedJob(jobId)
    setLines([])
  }

  // Rewind the byte offset on a job switch only (declared before the poll
  // effect so it resets first). Keyed on jobId so an active→terminal flip does
  // NOT rewind — that would re-read the whole file and duplicate lines.
  useEffect(() => {
    offsetRef.current = 0
  }, [jobId])

  useEffect(() => {
    if (!jobId || !isDesktopApp()) return
    let cancelled = false

    const poll = async () => {
      try {
        const chunk = await aiRuntimeService.trainingLogs(jobId, offsetRef.current)
        if (cancelled) return
        offsetRef.current = chunk.next_offset
        if (chunk.lines.length > 0) setLines((prev) => prev.concat(chunk.lines))
      } catch {
        // Transient (runtime restarting / busy) — the next tick retries.
      }
    }

    void poll()
    const id = isActive ? setInterval(poll, 1000) : undefined
    return () => {
      cancelled = true
      if (id) clearInterval(id)
    }
  }, [jobId, isActive])

  return lines
}

/** Load a finished job's training report (final metrics + ultralytics plot
 * paths) when `jobId` is set. Reset is the render-phase pattern; the fetch only
 * setStates after the promise resolves, so it stays clear of the
 * synchronous-setState-in-effect rule. */
export function useTrainingReport(jobId: string | null) {
  const [state, setState] = useState<{
    report: TrainingReport | null
    loading: boolean
    error: string | null
  }>({ report: null, loading: !!jobId, error: null })
  const [trackedJob, setTrackedJob] = useState<string | null>(jobId)

  if (jobId !== trackedJob) {
    setTrackedJob(jobId)
    setState({ report: null, loading: !!jobId, error: null })
  }

  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    aiRuntimeService
      .trainingReport(jobId)
      .then((report) => {
        if (!cancelled) setState({ report, loading: false, error: null })
      })
      .catch((e) => {
        if (!cancelled)
          setState({
            report: null,
            loading: false,
            error: toErrorMessage(e),
          })
      })
    return () => {
      cancelled = true
    }
  }, [jobId])

  return state
}

/** Start-training flow: export the project's annotations to a YOLO dataset,
 * then launch a run. Surfaces the export summary so the UI can show counts. */
export function useStartTraining(onStarted?: () => void) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastExport, setLastExport] = useState<DatasetExportResult | null>(null)

  const start = useCallback(
    async (opts: {
      projectId: string
      modelFamily: string
      name?: string
      epochs?: number
      imgsz?: number
      valSplit?: number
      /** ultralytics augmentation hyperparameters (fliplr, hsv_s, mosaic, …),
       *  merged into the training config. ultralytics applies them on the fly
       *  per batch during training — no pre-generated images on disk. */
      augmentation?: Record<string, number>
    }): Promise<DatasetExportResult | null> => {
      setBusy(true)
      setError(null)
      try {
        const dataset = await aiRuntimeService.exportDataset({
          projectId: opts.projectId,
          valSplit: opts.valSplit,
        })
        setLastExport(dataset)

        const config: Record<string, unknown> = {}
        if (opts.epochs) config.epochs = opts.epochs
        if (opts.imgsz) config.imgsz = opts.imgsz
        if (opts.augmentation) Object.assign(config, opts.augmentation)

        await aiRuntimeService.startTraining({
          projectId: opts.projectId,
          modelFamily: opts.modelFamily,
          datasetPath: dataset.datasetPath,
          name: opts.name,
          config,
        })
        onStarted?.()
        return dataset
      } catch (e) {
        setError(toErrorMessage(e))
        return null
      } finally {
        setBusy(false)
      }
    },
    [onStarted]
  )

  return { start, busy, error, lastExport, clearError: () => setError(null) }
}
