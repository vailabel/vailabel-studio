/**
 * Project Detail ViewModel
 * Manages project detail state and operations using React Query
 * Follows MVVM pattern with React Query as the binding layer
 */

import { useState, useMemo } from "react"
import { useQueryClient } from "react-query"
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
  useImages,
  useAnnotations,
  useLabels,
  useTasks,
} from "@/hooks/useFastAPIQuery"
import { Project, Annotation, Task } from "@vailabel/core"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

// Schema for project editing
export const ProjectEditSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  type: z.string().min(1, "Project type is required"),
  settings: z.record(z.unknown()).optional(),
})

export type ProjectEditForm = z.infer<typeof ProjectEditSchema>

// Schema for label creation
export const LabelCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Label name is required")
    .max(50, "Label name must be less than 50 characters"),
  description: z
    .string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color")
    .optional(),
  category: z
    .string()
    .max(50, "Category must be less than 50 characters")
    .optional(),
})

export type LabelCreateForm = z.infer<typeof LabelCreateSchema>

interface ImageFile {
  id: string
  name: string
  data: string
  width: number
  height: number
  file?: File
  size?: number
}

export const useProjectDetailViewModel = (projectId: string) => {
  const queryClient = useQueryClient()

  // State
  const [activeTab, setActiveTab] = useState<
    "overview" | "images" | "upload" | "annotations" | "labels" | "tasks"
  >("overview")
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [selectedAnnotations, setSelectedAnnotations] = useState<string[]>([])
  const [newImages, setNewImages] = useState<ImageFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false)
  const [isAddLabelModalOpen, setIsAddLabelModalOpen] = useState(false)
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [isCreatingLabel, setIsCreatingLabel] = useState(false)

  // Queries
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useProject(projectId)
  const {
    data: images = [],
    isLoading: imagesLoading,
    error: imagesError,
  } = useImages(projectId)
  const {
    data: annotations = [],
    isLoading: annotationsLoading,
    error: annotationsError,
  } = useAnnotations(projectId)
  const {
    data: labels = [],
    isLoading: labelsLoading,
    error: labelsError,
  } = useLabels(projectId)
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
  } = useTasks(projectId)

  // Mutations
  const updateProjectMutation = useUpdateProject()
  const deleteProjectMutation = useDeleteProject()

  // Computed values
  const projectStats = useMemo(() => {
    if (!project) return null

    const totalImages = images.length
    const annotatedImages = new Set(annotations.map((a) => a.image_id)).size
    const totalAnnotations = annotations.length
    const totalLabels = labels.length
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.status === "completed").length

    const progress = totalImages > 0 ? (annotatedImages / totalImages) * 100 : 0

    return {
      totalImages,
      annotatedImages,
      totalAnnotations,
      totalLabels,
      totalTasks,
      completedTasks,
      progress: Math.round(progress),
    }
  }, [project, images, annotations, labels, tasks])

  const annotationStats = useMemo(() => {
    const stats = labels.reduce(
      (acc, label) => {
        acc[label.name] = 0
        return acc
      },
      {} as Record<string, number>
    )

    annotations.forEach((annotation) => {
      const label = labels.find((l) => l.id === annotation.label_id)
      if (label) {
        stats[label.name] = (stats[label.name] || 0) + 1
      }
    })

    return Object.entries(stats).map(([label, count]) => ({
      label,
      count,
      percentage:
        annotations.length > 0 ? (count / annotations.length) * 100 : 0,
    }))
  }, [annotations, labels])

  const recentActivity = useMemo(() => {
    const activities = [
      ...images.map((img) => ({
        type: "image",
        data: img,
        date: img.createdAt,
      })),
      ...annotations.map((ann) => ({
        type: "annotation",
        data: ann,
        date: ann.createdAt,
      })),
      ...tasks.map((task) => ({
        type: "task",
        data: task,
        date: task.createdAt,
      })),
    ]

    return activities
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateB - dateA
      })
      .slice(0, 10)
  }, [images, annotations, tasks])

  // Actions
  const updateProject = async (updates: Partial<Project>) => {
    if (!project) throw new Error("Project not found")

    try {
      await updateProjectMutation.mutateAsync({
        id: project.id,
        updates,
      })
    } catch (error) {
      console.error("Failed to update project:", error)
      throw error
    }
  }

  const deleteProject = async () => {
    if (!project) throw new Error("Project not found")

    try {
      await deleteProjectMutation.mutateAsync(project.id)
    } catch (error) {
      console.error("Failed to delete project:", error)
      throw error
    }
  }

  const updateProjectSettings = async (settings: Record<string, unknown>) => {
    if (!project) throw new Error("Project not found")

    try {
      await updateProjectMutation.mutateAsync({
        id: project.id,
        updates: {
          settings: {
            ...project.settings,
            ...settings,
          },
        },
      })
    } catch (error) {
      console.error("Failed to update project settings:", error)
      throw error
    }
  }

  const exportProject = () => {
    if (!project) return

    const exportData = {
      project,
      images,
      annotations,
      labels,
      tasks,
      exportedAt: new Date().toISOString(),
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })

    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${project.name}-export.json`
    link.click()

    URL.revokeObjectURL(url)
  }

  const duplicateProject = async () => {
    if (!project) throw new Error("Project not found")

    try {
      const duplicateData = {
        name: `${project.name} (Copy)`,
        description: project.description,
        type: project.type,
        settings: project.settings,
      }

      // This would typically call a duplicate API endpoint
      console.log("Duplicating project:", duplicateData)
    } catch (error) {
      console.error("Failed to duplicate project:", error)
      throw error
    }
  }

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages((prev) =>
      prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : [...prev, imageId]
    )
  }

  const toggleAnnotationSelection = (annotationId: string) => {
    setSelectedAnnotations((prev) =>
      prev.includes(annotationId)
        ? prev.filter((id) => id !== annotationId)
        : [...prev, annotationId]
    )
  }

  const clearSelections = () => {
    setSelectedImages([])
    setSelectedAnnotations([])
  }

  const getImageAnnotations = (imageId: string) => {
    return annotations.filter((annotation) => annotation.image_id === imageId)
  }

  const getAnnotationLabel = (annotation: Annotation) => {
    return labels.find((label) => label.id === annotation.label_id)
  }

  const getTaskProgress = (task: Task) => {
    if (task.status === "completed") return 100
    if (task.status === "in_progress") return 50
    return 0
  }

  // Image upload handling
  const handleFiles = async (files: File[]) => {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const totalFiles = files.length
      const newImages: ImageFile[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Simulate progress for each file
        const fileProgress = ((i + 1) / totalFiles) * 100
        setUploadProgress(fileProgress)

        // Add a small delay to simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 200))

        const data = await readFileAsDataURL(file)
        const dimensions = await getImageDimensions(data)

        newImages.push({
          id: uuidv4(),
          name: file.name,
          data,
          width: dimensions.width,
          height: dimensions.height,
          file,
          size: file.size,
        })
      }

      setNewImages((prev) => [...prev, ...newImages])
      setUploadProgress(100)

      // Reset progress after a short delay
      setTimeout(() => {
        setUploadProgress(0)
      }, 1000)
    } catch (error) {
      console.error("Error processing files:", error)
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index))
  }

  const saveImages = async () => {
    if (newImages.length === 0) return

    setIsSaving(true)

    try {
      // Simulate saving images to the project
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Clear the new images after saving
      setNewImages([])

      // Refresh the images list
      queryClient.invalidateQueries(["images", projectId])
    } catch (error) {
      console.error("Error saving images:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const isLoading =
    projectLoading ||
    imagesLoading ||
    annotationsLoading ||
    labelsLoading ||
    tasksLoading
  const error =
    projectError || imagesError || annotationsError || labelsError || tasksError

  // Computed properties for the UI
  const projectName = project?.name || "Loading..."
  const totalCount = images.length
  const labelCount = labels.length
  const pageSize = 20

  // Navigation and modal state (these would typically be in separate state)
  const navigateBack = () => {
    // Implementation would depend on router setup
    window.history.back()
  }

  const openEditProjectModal = () => {
    setIsEditProjectModalOpen(true)
  }

  const closeEditProjectModal = () => {
    setIsEditProjectModalOpen(false)
  }

  const refreshData = () => {
    queryClient.invalidateQueries(["project", projectId])
    queryClient.invalidateQueries(["images", projectId])
    queryClient.invalidateQueries(["labels", projectId])
  }

  const loadProjectData = () => {
    queryClient.invalidateQueries(["project", projectId])
  }

  const navigateToImage = (imageId: string) => {
    // Implementation would depend on router setup
    console.log("Navigate to image:", imageId)
  }

  const deleteImage = (imageId: string) => {
    // Implementation would depend on API
    console.log("Delete image:", imageId)
  }

  const openAddLabelModal = () => {
    setIsAddLabelModalOpen(true)
  }

  const closeAddLabelModal = () => {
    setIsAddLabelModalOpen(false)
  }

  const createLabel = async (labelData: LabelCreateForm) => {
    setIsCreatingLabel(true)
    try {
      // Implementation would depend on API
      console.log("Create label:", labelData)
      setIsAddLabelModalOpen(false)
    } catch (error) {
      console.error("Error creating label:", error)
    } finally {
      setIsCreatingLabel(false)
    }
  }

  const deleteLabel = (labelId: string) => {
    // Implementation would depend on API
    console.log("Delete label:", labelId)
  }

  return {
    // State
    project,
    images,
    annotations,
    labels,
    tasks,
    activeTab,
    selectedImages,
    selectedAnnotations,
    newImages,
    isUploading,
    uploadProgress,
    isSaving,
    isEditProjectModalOpen,
    isAddLabelModalOpen,
    isEditingProject,
    isCreatingLabel,
    isLoading,
    error,

    // Computed values
    projectStats,
    annotationStats,
    recentActivity,
    projectName,
    totalCount,
    labelCount,
    pageSize,

    // Actions
    setActiveTab,
    updateProject,
    deleteProject,
    updateProjectSettings,
    exportProject,
    duplicateProject,
    toggleImageSelection,
    toggleAnnotationSelection,
    clearSelections,
    getImageAnnotations,
    getAnnotationLabel,
    getTaskProgress,
    handleFiles,
    handleRemoveImage,
    saveImages,
    navigateBack,
    openEditProjectModal,
    closeEditProjectModal,
    refreshData,
    loadProjectData,
    navigateToImage,
    deleteImage,
    openAddLabelModal,
    closeAddLabelModal,
    createLabel,
    deleteLabel,

    // Mutation state
    updateProjectMutation,
    deleteProjectMutation,
  }
}

// Helper functions
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = reject
    img.src = dataUrl
  })
}
