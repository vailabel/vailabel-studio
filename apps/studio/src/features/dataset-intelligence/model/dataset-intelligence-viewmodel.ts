import { useCallback, useEffect, useRef, useState } from "react"
import { listen } from "@tauri-apps/api/event"
import { isDesktopApp } from "@/shared/lib/desktop"
import { services } from "@/shared/services"
import type {
  AnalysisConfig,
  AnalysisJob,
  AnalysisReport,
  ReportSummary,
} from "@/shared/types/dataset-intelligence"
import { reportToMarkdown } from "@/features/dataset-intelligence/model/dataset-report"

const PROGRESS_EVENT = "analysis://progress"

/**
 * Drives the Dataset Intelligence dashboard: kicks off background analysis
 * jobs, tracks their progress (via the `analysis://progress` event with an
 * interval poll as a fallback), and loads / exports persisted reports.
 */
export const useDatasetIntelligenceViewModel = (projectId: string) => {
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [job, setJob] = useState<AnalysisJob | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activeJobRef = useRef<string | null>(null)

  const analysis = services.getAnalysisService()

  const refreshReports = useCallback(async () => {
    const list = await analysis.listReports(projectId)
    setReports(list)
  }, [analysis, projectId])

  const selectReport = useCallback(
    async (id: string) => {
      const next = await analysis.getReport(id)
      if (next) setReport(next)
    },
    [analysis]
  )

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [latest, list] = await Promise.all([
        analysis.latestReport(projectId),
        analysis.listReports(projectId),
      ])
      setReport(latest)
      setReports(list)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setIsLoading(false)
    }
  }, [analysis, projectId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleProgress = useCallback(
    (next: AnalysisJob) => {
      if (activeJobRef.current && next.jobId !== activeJobRef.current) return
      setJob(next)
      if (next.status === "completed" && next.reportId) {
        activeJobRef.current = null
        setIsRunning(false)
        void selectReport(next.reportId)
        void refreshReports()
      } else if (next.status === "failed") {
        activeJobRef.current = null
        setIsRunning(false)
        setError(next.error || "Analysis failed")
      }
    },
    [refreshReports, selectReport]
  )

  // Live progress over the Tauri event channel (desktop only).
  useEffect(() => {
    if (!isDesktopApp()) return
    let unlisten: (() => void) | undefined
    void listen<AnalysisJob>(PROGRESS_EVENT, ({ payload }) => {
      if (payload.projectId === projectId) handleProgress(payload)
    }).then((cleanup) => {
      unlisten = cleanup
    })
    return () => unlisten?.()
  }, [projectId, handleProgress])

  // Poll fallback so completion is detected even if an event is dropped.
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(async () => {
      const id = activeJobRef.current
      if (!id) return
      try {
        const status = await analysis.jobStatus(id)
        if (status) handleProgress(status)
      } catch {
        // transient; next tick retries
      }
    }, 1200)
    return () => clearInterval(interval)
  }, [analysis, isRunning, handleProgress])

  const runAnalysis = useCallback(
    async (config?: AnalysisConfig) => {
      setError(null)
      setIsRunning(true)
      try {
        const started = await analysis.run(projectId, config)
        activeJobRef.current = started.jobId
        setJob(started)
      } catch (nextError) {
        setIsRunning(false)
        setError(
          nextError instanceof Error ? nextError.message : String(nextError)
        )
      }
    },
    [analysis, projectId]
  )

  const deleteReport = useCallback(
    async (id: string) => {
      await analysis.deleteReport(id)
      if (report?.id === id) {
        const latest = await analysis.latestReport(projectId)
        setReport(latest)
      }
      await refreshReports()
    },
    [analysis, projectId, refreshReports, report?.id]
  )

  const exportReport = useCallback(
    (format: "json" | "markdown") => {
      if (!report) return
      const stamp = report.createdAt.slice(0, 19).replace(/[:T]/g, "-")
      if (format === "json") {
        downloadFile(
          `dataset-report-${stamp}.json`,
          JSON.stringify(report, null, 2),
          "application/json"
        )
      } else {
        downloadFile(
          `dataset-report-${stamp}.md`,
          reportToMarkdown(report),
          "text/markdown"
        )
      }
    },
    [report]
  )

  return {
    report,
    reports,
    job,
    isRunning,
    isLoading,
    error,
    loadData,
    runAnalysis,
    selectReport,
    deleteReport,
    exportReport,
  }
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
