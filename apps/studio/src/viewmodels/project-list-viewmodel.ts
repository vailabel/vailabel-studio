import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Project } from "@vailabel/core"
import { useToast } from "@/hooks/use-toast"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { services } from "@/services"

export const useProjectListViewModel = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const confirm = useConfirmDialog()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "updatedAt">(
    "updatedAt"
  )
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const loadProjects = async () => {
    setIsLoading(true)
    setError(null)
    try {
      setProjects(await services.getProjectService().list())
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadProjects()
  }, [])

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
    setProjects((current) => current.filter((entry) => entry.id !== projectId))
    toast({
      title: "Project deleted",
      description: `${project?.name ?? "Project"} was removed from this workspace.`,
    })
  }

  return {
    projects: filteredAndSortedProjects,
    allProjects: projects,
    isLoading,
    error,
    searchQuery,
    sortBy,
    sortOrder,
    refreshProjects: loadProjects,
    loadProjects,
    navigateToCreate: () => navigate("/projects/create"),
    navigateToProject: (projectId: string) =>
      navigate(`/projects/detail/${projectId}`),
    deleteProject,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    isEmpty: filteredAndSortedProjects.length === 0,
  }
}
