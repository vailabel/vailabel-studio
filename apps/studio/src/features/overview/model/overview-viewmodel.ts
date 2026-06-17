import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { AIModel, Project } from "@/shared/types/core"
import { listenToStudioEvents } from "@/shared/ipc/events"
import { services } from "@/shared/services"
import { isModelPredictionReady } from "@/shared/lib/ai-model-metadata"
import { useTrainingJobs } from "@/shared/model/ai-runtime-viewmodel"

/** A status / modality distribution slice, ready to render as a labeled bar. */
export interface DistributionEntry {
  label: string
  count: number
  percentage: number
}

function toDistribution(
  projects: Project[],
  key: (project: Project) => string
): DistributionEntry[] {
  const counts = projects.reduce<Record<string, number>>((acc, project) => {
    const value = key(project)
    acc[value] = (acc[value] ?? 0) + 1
    return acc
  }, {})
  const total = projects.length
  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      percentage: total ? Math.round((count / total) * 100) : 0,
    }))
    .sort((left, right) => right.count - left.count)
}

// Dashboard view model. Every figure here comes from a cheap, reliable source:
// projectsService.list() (incl. the live server-computed Project.imageCount),
// aiModelsService.list(), and the training-job runtime — no fabricated metrics
// and no per-project annotation loads on the home screen.
export const useOverviewViewModel = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [models, setModels] = useState<AIModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Training jobs come from the runtime and auto-refresh on their own events;
  // empty (and harmless) on the web build where there's no runtime.
  const { jobs: trainingJobs } = useTrainingJobs()

  const refreshData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Projects are the critical payload; if they load, the dashboard renders.
      setProjects(await services.getProjectService().list())
      // Installed models are best-effort — a failure here must not blank the page.
      try {
        setModels(await services.getAIModelService().list())
      } catch {
        setModels([])
      }
      setLastUpdated(new Date())
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Defer the initial load so the synchronous setIsLoading inside refreshData
  // runs in a microtask, not directly in the effect body.
  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => {
      if (active) void refreshData()
    })
    return () => {
      active = false
    }
  }, [refreshData])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    void listenToStudioEvents(() => {
      void refreshData()
    }, ["projects", "ai_models"]).then((cleanup) => {
      unlisten = cleanup
    })
    return () => {
      unlisten?.()
    }
  }, [refreshData])

  const stats = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    return {
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status === "active").length,
      completedProjects: projects.filter((p) => p.status === "completed").length,
      draftProjects: projects.filter((p) => p.status === "draft").length,
      // Live server-side COUNT per project — the true cross-project item total.
      totalImages: projects.reduce((sum, p) => sum + Number(p.imageCount ?? 0), 0),
      updatedThisWeek: projects.filter((p) => {
        const updatedAt = p.updatedAt ? new Date(p.updatedAt) : null
        return (
          !!updatedAt && !Number.isNaN(updatedAt.getTime()) && updatedAt >= cutoff
        )
      }).length,
    }
  }, [projects])

  const statusBreakdown = useMemo(
    () => toDistribution(projects, (p) => p.status?.trim() || "unknown"),
    [projects]
  )

  // Prefer the two-axis modality; fall back to the legacy type for old projects.
  const modalityBreakdown = useMemo(
    () => toDistribution(projects, (p) => p.modality || p.type || "unknown"),
    [projects]
  )

  const aiModels = useMemo(
    () => ({
      installed: models.length,
      ready: models.filter((model) => isModelPredictionReady(model)).length,
    }),
    [models]
  )

  const training = useMemo(() => {
    const running = trainingJobs.filter(
      (job) => job.status === "running" || job.status === "pending"
    )
    const active = running.find((job) => job.status === "running")
    return {
      total: trainingJobs.length,
      running: running.length,
      activeProgress: active ? Math.round((active.progress ?? 0) * 100) : null,
    }
  }, [trainingJobs])

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort(
          (left, right) =>
            new Date(right.updatedAt ?? right.createdAt ?? 0).getTime() -
            new Date(left.updatedAt ?? left.createdAt ?? 0).getTime()
        )
        .slice(0, 5),
    [projects]
  )

  const quickActions = useMemo(
    () => [
      {
        id: "create-project",
        label: "Create New Project",
        description: "Start a new annotation project",
        icon: "plus",
        action: () => navigate("/projects/create"),
      },
      {
        id: "view-projects",
        label: "View All Projects",
        description: "Browse and open your projects",
        icon: "folder",
        action: () => navigate("/projects"),
      },
      {
        id: "ai-models",
        label: "AI Models",
        description: "Manage auto-label & segmentation models",
        icon: "cpu",
        action: () => navigate("/ai-models"),
      },
      {
        id: "labels",
        label: "Manage Labels",
        description: "Review your label library",
        icon: "tag",
        action: () => navigate("/labels"),
      },
    ],
    [navigate]
  )

  return {
    projects,
    isLoading,
    error,
    isEmpty: projects.length === 0,
    lastUpdated,
    refreshData,
    stats,
    statusBreakdown,
    modalityBreakdown,
    aiModels,
    training,
    recentProjects,
    quickActions,
    openProject: (project: Project) =>
      navigate(`/projects/detail/${project.id}`),
  }
}
