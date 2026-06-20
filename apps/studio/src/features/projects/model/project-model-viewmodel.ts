import { useEffect, useState } from "react"
import { useTrainingJobs } from "@/shared/model/ai-runtime-viewmodel"
import { aiRuntimeService } from "@/shared/services/ai-runtime-service"
import type { TrainingJob } from "@/shared/types/ai-runtime"

/** Final-epoch detection metrics pulled from a run's `results.csv`. */
export interface ModelVersionMetrics {
  map50: number | null
  map5095: number | null
  precision: number | null
  recall: number | null
}

/** One step in the project's model lineage — a completed real training run,
 *  numbered oldest-first (v1, v2, …). The newest is the one auto-label serves. */
export interface ModelVersion extends ModelVersionMetrics {
  version: number
  jobId: string
  name: string
  createdAt?: string
  isLatest: boolean
}

const EMPTY_METRICS: ModelVersionMetrics = {
  map50: null,
  map5095: null,
  precision: null,
  recall: null,
}

/** A completed run that produced a real model (the placeholder/simulated trainer
 *  yields no weights, so it isn't a version). */
const isRealCompleted = (job: TrainingJob): boolean =>
  job.status === "completed" &&
  !(job.metrics as { simulated?: boolean } | null)?.simulated

const numOrNull = (value: number | null | undefined): number | null =>
  typeof value === "number" && !Number.isNaN(value) ? value : null

/**
 * The project's model lineage for the flywheel view: every completed training
 * run becomes a numbered version, enriched with its `results.csv` metrics
 * (fetched once per run). Reuses the existing training jobs + report plumbing —
 * no new backend. Surfaces the latest version (what auto-label serves) and the
 * best mAP@50 reached so far.
 */
export function useProjectModelVersions(projectId?: string) {
  const { jobs: allJobs, loading, error, reload } = useTrainingJobs()
  const jobs = projectId
    ? allJobs.filter((job) => job.projectId === projectId)
    : allJobs

  const completed = jobs
    .filter(isRealCompleted)
    .slice()
    .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))

  const [metrics, setMetrics] = useState<Record<string, ModelVersionMetrics>>({})

  // Re-fetch reports only when the set of completed runs changes.
  const ids = completed.map((job) => job.id).join(",")
  useEffect(() => {
    if (!ids) return
    let cancelled = false
    const jobIds = ids.split(",")
    void Promise.all(
      jobIds.map(async (jobId): Promise<[string, ModelVersionMetrics]> => {
        try {
          const report = await aiRuntimeService.trainingReport(jobId)
          return [
            jobId,
            {
              map50: numOrNull(report.final["metrics/mAP50(B)"]),
              map5095: numOrNull(report.final["metrics/mAP50-95(B)"]),
              precision: numOrNull(report.final["metrics/precision(B)"]),
              recall: numOrNull(report.final["metrics/recall(B)"]),
            },
          ]
        } catch {
          return [jobId, EMPTY_METRICS]
        }
      })
    ).then((entries) => {
      if (!cancelled) setMetrics(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [ids])

  const versions: ModelVersion[] = completed.map((job, index) => ({
    version: index + 1,
    jobId: job.id,
    name: job.name,
    createdAt: job.createdAt,
    isLatest: index === completed.length - 1,
    ...(metrics[job.id] ?? EMPTY_METRICS),
  }))

  const latest = versions.length ? versions[versions.length - 1] : null
  const bestMap50 = versions.reduce<number | null>(
    (best, v) =>
      v.map50 != null && (best == null || v.map50 > best) ? v.map50 : best,
    null
  )

  /** A run is mid-flight (the flywheel is "spinning" right now). */
  const isTraining = jobs.some(
    (job) => job.status === "running" || job.status === "pending"
  )

  return {
    versions,
    latest,
    bestMap50,
    isTraining,
    totalRuns: jobs.length,
    loading,
    error,
    reload,
  }
}
