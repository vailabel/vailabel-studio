/**
 * Project List ViewModel
 * Manages project list state and operations using React Query
 * Follows MVVM pattern with React Query as the binding layer
 */

import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useProjects, useDeleteProject } from "@/hooks/api/project-hooks"
import { Project } from "@vailabel/core"
import { useToast } from "@/hooks/use-toast"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"

export const useProjectListViewModel = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const confirm = useConfirmDialog()

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "updatedAt">(
    "updatedAt"
  )
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterType, setFilterType] = useState<string>("all")
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])

  // Queries
  const { data: projects = [], isLoading, error, refetch } = useProjects()

  // Mutations
  const deleteProjectMutation = useDeleteProject()

  // Computed values
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((project) => project.type === filterType)
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "createdAt":
          try {
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0
            if (isNaN(aValue)) aValue = 0
            if (isNaN(bValue)) bValue = 0
          } catch {
            aValue = 0
            bValue = 0
          }
          break
        case "updatedAt":
          try {
            aValue = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
            bValue = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
            if (isNaN(aValue)) aValue = 0
            if (isNaN(bValue)) bValue = 0
          } catch {
            aValue = 0
            bValue = 0
          }
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [projects, searchQuery, sortBy, sortOrder, filterType])

  const projectTypes = useMemo(() => {
    const types = new Set(projects.map((project) => project.type))
    return Array.from(types)
  }, [projects])

  const selectedProjectsData = useMemo(() => {
    return projects.filter((project) => selectedProjects.includes(project.id))
  }, [projects, selectedProjects])

  // Actions
  const updateSearchQuery = (query: string) => {
    setSearchQuery(query)
  }

  const updateSorting = (
    by: "name" | "createdAt" | "updatedAt",
    order: "asc" | "desc"
  ) => {
    setSortBy(by)
    setSortOrder(order)
  }

  const updateFilterType = (type: string) => {
    setFilterType(type)
  }

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    )
  }

  const selectAllProjects = () => {
    setSelectedProjects(filteredAndSortedProjects.map((project) => project.id))
  }

  const clearSelection = () => {
    setSelectedProjects([])
  }

  const deleteProject = async (projectId: string) => {
    // Find project name for confirmation message
    const project = projects.find((p) => p.id === projectId)
    const projectName = project?.name || "this project"

    // Confirm before deleting
    const confirmed = await confirm({
      title: "Delete Project?",
      description: `Are you sure you want to delete "${projectName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    })

    if (!confirmed) return

    try {
      await deleteProjectMutation.mutateAsync(projectId)
      // Remove from selection if it was selected
      setSelectedProjects((prev) => prev.filter((id) => id !== projectId))
      toast({
        title: "Project deleted",
        description: `"${projectName}" has been successfully deleted.`,
      })
    } catch (error) {
      console.error("Failed to delete project:", error)
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  const deleteSelectedProjects = async () => {
    try {
      // This would typically call the delete API for multiple projects
      console.log("Delete selected projects:", selectedProjects)
      clearSelection()
    } catch (error) {
      console.error("Failed to delete selected projects:", error)
      throw error
    }
  }

  const duplicateProject = async (project: Project) => {
    try {
      // This would typically create a new project with the same settings
      // For now, we'll just log it
      console.log("Duplicating project:", project.name)
      // In a real implementation, you would call a duplicate API endpoint
    } catch (error) {
      console.error("Failed to duplicate project:", error)
      throw error
    }
  }

  const exportProject = (project: Project) => {
    try {
      const dataStr = JSON.stringify(project, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })

      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${project.name}-export.json`
      link.click()

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export project:", error)
      throw error
    }
  }

  const refreshProjects = () => {
    refetch()
  }

  // Helper functions for navigation and other actions
  const navigateToCreate = () => {
    navigate("/projects/create")
  }

  const navigateToProject = (projectId: string) => {
    navigate(`/projects/detail/${projectId}`)
  }

  const handleSetSearchQuery = (query: string) => {
    setSearchQuery(query)
  }

  const handleSetSortBy = (sortBy: "name" | "createdAt" | "updatedAt") => {
    setSortBy(sortBy)
  }

  const handleSetSortOrder = (order: "asc" | "desc") => {
    setSortOrder(order)
  }

  const loadProjects = () => {
    refetch()
  }

  const isEmpty = projects.length === 0

  return {
    // State
    projects: filteredAndSortedProjects,
    allProjects: projects,
    isLoading,
    error,
    searchQuery,
    sortBy,
    sortOrder,
    filterType,
    selectedProjects,
    selectedProjectsData,
    projectTypes,

    // Actions
    updateSearchQuery,
    updateSorting,
    updateFilterType,
    toggleProjectSelection,
    selectAllProjects,
    clearSelection,
    deleteProject,
    deleteSelectedProjects,
    duplicateProject,
    exportProject,
    refreshProjects,
    navigateToCreate,
    navigateToProject,
    setSearchQuery: handleSetSearchQuery,
    setSortBy: handleSetSortBy,
    setSortOrder: handleSetSortOrder,
    loadProjects,
    isEmpty,
  }
}
