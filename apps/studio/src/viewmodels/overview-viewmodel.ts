import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Project } from "@/types/core"
import { listenToStudioEvents } from "@/ipc/events"
import { services } from "@/services"

export const useOverviewViewModel = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const refreshData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setProjects(await services.getProjectService().list())
      setLastUpdated(new Date())
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshData()
  }, [refreshData])

  useEffect(() => {
    let unlisten: (() => void) | undefined

    void listenToStudioEvents(() => {
      void refreshData()
    }, ["projects"]).then((cleanup) => {
      unlisten = cleanup
    })

    return () => {
      unlisten?.()
    }
  }, [refreshData])

  const stats = useMemo(() => {
    const totalProjects = projects.length
    return {
      totalProjects,
      activeProjects: projects.filter((project) => project.status === "active")
        .length,
      completedProjects: projects.filter(
        (project) => project.status === "completed"
      ).length,
      draftProjects: projects.filter((project) => project.status === "draft")
        .length,
      recentProjects: projects.filter((project) => {
        const updatedAt = project.updatedAt ? new Date(project.updatedAt) : null
        if (!updatedAt || Number.isNaN(updatedAt.getTime())) return false
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 7)
        return updatedAt >= cutoff
      }).length,
      totalAnnotations: projects.reduce(
        (count, project) => count + Number(project.metadata?.annotationCount ?? 0),
        0
      ),
      projectTypes: projects.reduce(
        (types, project) => ({
          ...types,
          [project.type]: Number(types[project.type] ?? 0) + 1,
        }),
        {} as Record<string, number>
      ),
      labelsCreated: projects.reduce(
        (count, project) => count + Number(project.metadata?.labelCount ?? 0),
        0
      ),
      pendingTasks: projects.reduce(
        (count, project) => count + Number(project.metadata?.pendingTaskCount ?? 0),
        0
      ),
    }
  }, [projects])

  return {
    projects,
    isLoading,
    error,
    stats,
    recentProjects: [...projects]
      .sort(
        (left, right) =>
          new Date(right.updatedAt ?? right.createdAt ?? 0).getTime() -
          new Date(left.updatedAt ?? left.createdAt ?? 0).getTime()
      )
      .slice(0, 5),
    quickActions: [
      {
        id: "create-project",
        label: "Create New Project",
        description: "Start a new annotation project",
        icon: "plus",
        color: "bg-primary",
        action: () => navigate("/projects/create"),
        disabled: false,
      },
      {
        id: "view-projects",
        label: "View All Projects",
        description: "Browse your projects",
        icon: "folder",
        color: "bg-blue-600",
        action: () => navigate("/projects"),
        disabled: false,
      },
      {
        id: "labels",
        label: "Manage Labels",
        description: "Review your label library",
        icon: "tag",
        color: "bg-green-600",
        action: () => navigate("/labels"),
        disabled: false,
      },
      {
        id: "tasks",
        label: "Review Tasks",
        description: "Track outstanding labeling work",
        icon: "check-square",
        color: "bg-amber-600",
        action: () => navigate("/tasks"),
        disabled: false,
      },
    ],
    isEmpty: projects.length === 0,
    lastUpdated,
    refreshData,
  }
}

