import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Project } from "@/shared/types/core"
import { toast } from "sonner"
import { useConfirmDialog } from "@/shared/hooks/use-confirm-dialog"
import { useResource } from "@/shared/hooks/use-resource"
import { services } from "@/shared/services"
import {
  getRecentProjectIds,
  recordRecentProject,
  removeRecentProject,
} from "@/features/projects/model/recent-projects"
import { paths } from "@/shared/lib/routes"

const NO_PROJECTS: Project[] = []
const loadProjectList = () => services.getProjectService().list()

export const useProjectListViewModel = () => {
  const navigate = useNavigate()
  const confirm = useConfirmDialog()
  const {
    data: projects,
    isLoading,
    error,
    reload: loadProjects,
    mutate: mutateProjects,
  } = useResource(loadProjectList, {
    initialData: NO_PROJECTS,
    invalidateOn: ["projects"],
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "updatedAt">(
    "updatedAt"
  )
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

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
    mutateProjects((current) =>
      current.filter((entry) => entry.id !== projectId)
    )
    toast("Project deleted", {
      description: `${project?.name ?? "Project"} was removed from this workspace.`,
    })
  }

  const navigateToProject = (projectId: string) => {
    recordRecentProject(projectId)
    navigate(paths.projectDetail(projectId))
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
    navigateToCreate: () => navigate(paths.projectCreate),
    navigateToProject,
    deleteProject,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    isEmpty: filteredAndSortedProjects.length === 0,
  }
}

