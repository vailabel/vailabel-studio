import { useState, useCallback, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from "react-router-dom"
import { useServices } from "@/services/ServiceProvider"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import type { Project } from "@vailabel/core"

export interface ProjectListState {
  projects: Project[]
  isLoading: boolean
  error: string | null
  searchQuery: string
  sortBy: "name" | "createdAt" | "updatedAt"
  sortOrder: "asc" | "desc"
}

export interface ProjectListActions {
  // Data operations
  loadProjects: () => Promise<void>
  refreshProjects: () => Promise<void>
  
  // Project operations
  deleteProject: (projectId: string) => Promise<void>
  navigateToProject: (projectId: string) => void
  navigateToCreate: () => void
  
  // Search and filter
  setSearchQuery: (query: string) => void
  setSortBy: (sortBy: "name" | "createdAt" | "updatedAt") => void
  setSortOrder: (order: "asc" | "desc") => void
  
  // Computed values
  filteredProjects: Project[]
  isEmpty: boolean
}

export function useProjectListViewModel(): ProjectListState & ProjectListActions {
  const { toast } = useToast()
  const navigate = useNavigate()
  const services = useServices()
  const confirm = useConfirmDialog()

  // State
  const [state, setState] = useState<ProjectListState>({
    projects: [],
    isLoading: false,
    error: null,
    searchQuery: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  })

  // Actions
  const loadProjects = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const fetchedProjects = await services.getProjectService().getProjects()
      setState(prev => ({
        ...prev,
        projects: fetchedProjects,
        isLoading: false,
      }))
    } catch (error) {
      console.error("Failed to load projects:", error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: "Failed to load projects",
      }))
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      })
    }
  }, [toast])

  // Load projects on mount
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const refreshProjects = useCallback(async () => {
    await loadProjects()
    toast({
      title: "Refreshed",
      description: "Projects list has been updated",
    })
  }, [loadProjects, toast])

  const deleteProjectAction = useCallback(async (projectId: string) => {
    const ok = await confirm({
      title: "Delete Project?",
      description: "This action cannot be undone. This will permanently delete the project and all its images.",
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    
    if (!ok) return

    try {
      await services.getProjectService().deleteProject(projectId)
      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== projectId),
      }))
      toast({
        title: "Success",
        description: "Project deleted successfully",
      })
    } catch (error) {
      console.error("Failed to delete project:", error)
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      })
    }
  }, [confirm, toast])

  const navigateToProject = useCallback((projectId: string) => {
    navigate(`/projects/detail/${projectId}`)
  }, [navigate])

  const navigateToCreate = useCallback(() => {
    navigate("/projects/create")
  }, [navigate])

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }))
  }, [])

  const setSortBy = useCallback((sortBy: "name" | "createdAt" | "updatedAt") => {
    setState(prev => ({ ...prev, sortBy }))
  }, [])

  const setSortOrder = useCallback((order: "asc" | "desc") => {
    setState(prev => ({ ...prev, sortOrder: order }))
  }, [])

  // Computed values
  const filteredProjects = useCallback(() => {
    let filtered = [...state.projects]

    // Apply search filter
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase()
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | Date
      let bValue: string | Date

      switch (state.sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "createdAt":
          aValue = a.createdAt || new Date(0)
          bValue = b.createdAt || new Date(0)
          break
        case "updatedAt":
          aValue = a.updatedAt || new Date(0)
          bValue = b.updatedAt || new Date(0)
          break
        default:
          return 0
      }

      if (aValue < bValue) return state.sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return state.sortOrder === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [state.projects, state.searchQuery, state.sortBy, state.sortOrder])

  const isEmpty = state.projects.length === 0 && !state.isLoading

  return {
    ...state,
    loadProjects,
    refreshProjects,
    deleteProject: deleteProjectAction,
    navigateToProject,
    navigateToCreate,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    filteredProjects: filteredProjects(),
    isEmpty,
  }
}
