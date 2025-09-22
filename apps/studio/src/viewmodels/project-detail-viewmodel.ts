import { useState, useCallback, useEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { useServices } from "@/services/ServiceProvider"
import { usePaginatedImages } from "@/hooks/use-paginated-images"
import { createImageDataService } from "@/services/image-data-service"
import type { Project, Label, ImageData } from "@vailabel/core"
import { z } from "zod"

// Validation schemas
export const ProjectEditSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Project name too long"),
  description: z.string().max(500, "Description too long").optional(),
})

export const LabelCreateSchema = z.object({
  name: z.string().min(1, "Label name is required").max(50, "Label name too long"),
  color: z.string().min(1, "Color is required"),
})

export type ProjectEditForm = z.infer<typeof ProjectEditSchema>
export type LabelCreateForm = z.infer<typeof LabelCreateSchema>

export interface ProjectDetailState {
  project: Project | null
  labels: Label[]
  isLoading: boolean
  error: string | null
  activeTab: "images" | "labels"
  // Modal states
  isEditProjectModalOpen: boolean
  isAddLabelModalOpen: boolean
  isEditingProject: boolean
  isCreatingLabel: boolean
}

export interface ProjectDetailActions {
  // Data operations
  loadProjectData: () => Promise<void>
  refreshData: () => Promise<void>
  
  // Navigation
  navigateToImage: (imageId: string) => void
  navigateBack: () => void
  
  // UI operations
  setActiveTab: (tab: "images" | "labels") => void
  
  // Modal operations
  openEditProjectModal: () => void
  closeEditProjectModal: () => void
  openAddLabelModal: () => void
  closeAddLabelModal: () => void
  
  // Project operations
  updateProject: (formData: ProjectEditForm) => Promise<void>
  
  // Label operations
  createLabel: (formData: LabelCreateForm) => Promise<void>
  deleteLabel: (labelId: string) => Promise<void>
  
  // Validation
  validateProjectForm: (formData: Partial<ProjectEditForm>) => Record<string, string>
  validateLabelForm: (formData: Partial<LabelCreateForm>) => Record<string, string>
  
  // Computed values
  projectName: string
  labelCount: number
  hasData: boolean
  
  // Paginated images properties
  images: ImageData[]
  totalCount: number
  isLoading: boolean
  error: string | null
  pageIndex: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  deleteImage: (imageId: string) => Promise<void>
}

export function useProjectDetailViewModel(): ProjectDetailState & ProjectDetailActions {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const services = useServices()
  
  // Create image data service - memoize to prevent recreation
  const imageDataService = useMemo(() => createImageDataService(
    (projectId: string) => services.getImageDataService().getImagesByProjectId(projectId),
    (imageId: string) => services.getImageDataService().deleteImage(imageId),
    (imageId: string, updates: Partial<ImageData>) => services.getImageDataService().updateImage(imageId, updates)
  ), [])
  
  // Use paginated images hook
  const paginatedImages = usePaginatedImages(imageDataService, {
    projectId: projectId || "",
    initialPageSize: 10,
    autoLoad: !!projectId,
  })

  // State
  const [state, setState] = useState<ProjectDetailState>({
    project: null,
    labels: [],
    isLoading: false,
    error: null,
    activeTab: "images",
    isEditProjectModalOpen: false,
    isAddLabelModalOpen: false,
    isEditingProject: false,
    isCreatingLabel: false,
  })

  // Actions
  const loadProjectData = useCallback(async () => {
    if (!projectId) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Load project and labels in parallel
      const [project, projectLabels] = await Promise.all([
        services.getProjectService().getProject(projectId),
        services.getLabelService().getLabelsByProjectId(projectId),
      ])

      setState(prev => ({
        ...prev,
        project: project || null,
        labels: projectLabels,
        isLoading: false,
      }))
    } catch (error) {
      console.error("Failed to load project data:", error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: "Failed to load project data",
      }))
      toast({
        title: "Error",
        description: "Failed to load project data",
        variant: "destructive",
      })
    }
  }, [projectId, toast])

  // Load data on mount
  useEffect(() => {
    if (projectId) {
      loadProjectData()
    }
  }, [projectId, loadProjectData])

  const refreshData = useCallback(async () => {
    await Promise.all([
      loadProjectData(),
      paginatedImages.refresh(),
    ])
    toast({
      title: "Refreshed",
      description: "Project data has been updated",
    })
  }, [loadProjectData, paginatedImages, toast])

  const navigateToImage = useCallback((imageId: string) => {
    if (!projectId) return
    navigate(`/projects/${projectId}/studio/${imageId}`)
  }, [navigate, projectId])

  const navigateBack = useCallback(() => {
    navigate("/projects")
  }, [navigate])

  const setActiveTab = useCallback((tab: "images" | "labels") => {
    setState(prev => ({ ...prev, activeTab: tab }))
  }, [])

  // Modal operations
  const openEditProjectModal = useCallback(() => {
    setState(prev => ({ ...prev, isEditProjectModalOpen: true }))
  }, [])

  const closeEditProjectModal = useCallback(() => {
    setState(prev => ({ ...prev, isEditProjectModalOpen: false }))
  }, [])

  const openAddLabelModal = useCallback(() => {
    setState(prev => ({ ...prev, isAddLabelModalOpen: true }))
  }, [])

  const closeAddLabelModal = useCallback(() => {
    setState(prev => ({ ...prev, isAddLabelModalOpen: false }))
  }, [])

  // Validation
  const validateProjectForm = useCallback((formData: Partial<ProjectEditForm>): Record<string, string> => {
    try {
      ProjectEditSchema.parse(formData)
      return {}
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.issues.forEach((err: z.ZodIssue) => {
          const path = err.path.join('.')
          errors[path] = err.message
        })
        return errors
      }
      return { general: "Validation failed" }
    }
  }, [])

  const validateLabelForm = useCallback((formData: Partial<LabelCreateForm>): Record<string, string> => {
    try {
      LabelCreateSchema.parse(formData)
      return {}
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.issues.forEach((err: z.ZodIssue) => {
          const path = err.path.join('.')
          errors[path] = err.message
        })
        return errors
      }
      return { general: "Validation failed" }
    }
  }, [])

  // Project operations
  const updateProject = useCallback(async (formData: ProjectEditForm) => {
    if (!projectId || !state.project) return

    setState(prev => ({ ...prev, isEditingProject: true }))

    try {
      await services.getProjectService().updateProject(projectId, {
        name: formData.name.trim(),
      })

      // Update local state
      setState(prev => ({
        ...prev,
        project: prev.project ? {
          ...prev.project,
          name: formData.name.trim(),
        } : null,
        isEditProjectModalOpen: false,
        isEditingProject: false,
      }))

      toast({
        title: "Project updated",
        description: "Project details have been saved successfully.",
      })
    } catch (error) {
      console.error("Failed to update project:", error)
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      })
      setState(prev => ({ ...prev, isEditingProject: false }))
    }
  }, [projectId, state.project, toast])

  // Label operations
  const createLabel = useCallback(async (formData: LabelCreateForm) => {
    if (!projectId) return

    setState(prev => ({ ...prev, isCreatingLabel: true }))

    try {
      await services.getLabelService().createLabel({
        id: crypto.randomUUID(),
        name: formData.name.trim(),
        color: formData.color,
        projectId,
      })

      // Create the label object for local state
      const newLabel: Label = {
        id: crypto.randomUUID(),
        name: formData.name.trim(),
        color: formData.color,
        projectId,
      }

      // Update local state
      setState(prev => ({
        ...prev,
        labels: [...prev.labels, newLabel],
        isAddLabelModalOpen: false,
        isCreatingLabel: false,
      }))

      toast({
        title: "Label created",
        description: `Label "${formData.name}" has been added successfully.`,
      })
    } catch (error) {
      console.error("Failed to create label:", error)
      toast({
        title: "Error",
        description: "Failed to create label",
        variant: "destructive",
      })
      setState(prev => ({ ...prev, isCreatingLabel: false }))
    }
  }, [projectId, toast])

  const deleteLabel = useCallback(async (labelId: string) => {
    setState(prev => ({ ...prev, isCreatingLabel: true }))

    try {
      await services.getLabelService().deleteLabel(labelId)

      // Update local state
      setState(prev => ({
        ...prev,
        labels: prev.labels.filter(label => label.id !== labelId),
        isCreatingLabel: false,
      }))

      toast({
        title: "Label deleted",
        description: "Label has been removed successfully.",
      })
    } catch (error) {
      console.error("Failed to delete label:", error)
      toast({
        title: "Error",
        description: "Failed to delete label",
        variant: "destructive",
      })
      setState(prev => ({ ...prev, isCreatingLabel: false }))
    }
  }, [toast])

  // Computed values
  const projectName = state.project?.name || "Unknown Project"
  const labelCount = state.labels.length
  const hasData = !state.isLoading && !state.error

  return {
    ...state,
    ...paginatedImages,
    loadProjectData,
    refreshData,
    navigateToImage,
    navigateBack,
    setActiveTab,
    openEditProjectModal,
    closeEditProjectModal,
    openAddLabelModal,
    closeAddLabelModal,
    updateProject,
    createLabel,
    deleteLabel,
    validateProjectForm,
    validateLabelForm,
    projectName,
    labelCount,
    hasData,
  }
}
