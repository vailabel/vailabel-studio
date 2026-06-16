import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Project } from "@/shared/types/core"
import { listenToStudioEvents } from "@/shared/ipc/events"
import { toast } from "sonner"
import { useConfirmDialog } from "@/shared/hooks/use-confirm-dialog"
import { services } from "@/shared/services"
import {
  getRecentProjectIds,
  recordRecentProject,
  removeRecentProject,
} from "@/features/projects/model/recent-projects"

export const useProjectListViewModel = () => {
  const navigate = useNavigate()
  const confirm = useConfirmDialog()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "updatedAt">(
    "updatedAt"
  )
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const loadProjects = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setProjects(await services.getProjectService().list())
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  useEffect(() => {
    let unlisten: (() => void) | undefined

    void listenToStudioEvents(() => {
      void loadProjects()
    }, ["projects"]).then((cleanup) => {
      unlisten = cleanup
    })

    return () => {
      unlisten?.()
    }
  }, [loadProjects])

  const filteredAndSortedProjects = useMemo(() => {
    const filtered = projects.filter((project) => {
      const query = searchQuery.toLowerCase()
      return (
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
      )
    })

    return [...filtered].sort((left, right) => {
      const leftValue =
        sortBy === "name"
          ? left.name.toLowerCase()
          : new Date(left[sortBy] ?? 0).getTime()
      const rightValue =
        sortBy === "name"
          ? right.name.toLowerCase()
          : new Date(right[sortBy] ?? 0).getTime()

      if (leftValue < rightValue) return sortOrder === "asc" ? -1 : 1
      if (leftValue > rightValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [projects, searchQuery, sortBy, sortOrder])

  const recentProjects = useMemo(() => {
    const ids = getRecentProjectIds()
    return ids
      .map((id) => projects.find((project) => project.id === id))
      .filter((project): project is Project => Boolean(project))
  }, [projects])

  const deleteProject = async (projectId: string) => {
    const project = projects.find((entry) => entry.id === projectId)
    const confirmed = await confirm({
      title: "Delete Project?",
      description: `Are you sure you want to delete "${project?.name ?? "this project"}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    })

    if (!confirmed) return

    await services.getProjectService().delete(projectId)
    removeRecentProject(projectId)
    setProjects((current) => current.filter((entry) => entry.id !== projectId))
    toast("Project deleted", {
      description: `${project?.name ?? "Project"} was removed from this workspace.`,
    })
  }

  const navigateToProject = (projectId: string) => {
    recordRecentProject(projectId)
    navigate(`/projects/detail/${projectId}`)
  }

  return {
    projects: filteredAndSortedProjects,
    allProjects: projects,
    recentProjects,
    isLoading,
    error,
    searchQuery,
    sortBy,
    sortOrder,
    refreshProjects: loadProjects,
    loadProjects,
    navigateToCreate: () => navigate("/projects/create"),
    navigateToProject,
    deleteProject,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    isEmpty: filteredAndSortedProjects.length === 0,
  }
}

