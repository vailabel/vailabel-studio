import { useCallback, useEffect, useMemo, useState } from "react"
import { Annotation, ImageData, Label, Project, Task } from "@/types/core"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import { useNavigate } from "react-router-dom"
import { listenToStudioEvents } from "@/ipc/events"
import { services } from "@/services"

export const ProjectEditSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.string().min(1),
  settings: z.record(z.unknown()).optional(),
})

export type ProjectEditForm = z.infer<typeof ProjectEditSchema>

export const LabelCreateSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  color: z.string().optional(),
  category: z.string().max(50).optional(),
})

export type LabelCreateForm = z.infer<typeof LabelCreateSchema>

interface UploadImage extends ImageData {
  file?: File
  size?: number
}

export const useProjectDetailViewModel = (projectId: string) => {
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [images, setImages] = useState<ImageData[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeTab, setActiveTab] = useState<"images" | "upload" | "labels">(
    "images"
  )
  const [newImages, setNewImages] = useState<UploadImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false)
  const [isAddLabelModalOpen, setIsAddLabelModalOpen] = useState(false)
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [isCreatingLabel, setIsCreatingLabel] = useState(false)

  const refreshData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [nextProject, nextImages, nextAnnotations, nextLabels, nextTasks] =
        await Promise.all([
          services.getProjectService().getById(projectId),
          services.getImageService().getImagesByProjectId(projectId),
          services.getAnnotationService().getAnnotationsByProjectId(projectId),
          services.getLabelService().getLabelsByProjectId(projectId),
          services.getTaskService().listByProjectId(projectId),
        ])
      setProject(nextProject)
      setImages(nextImages)
      setAnnotations(nextAnnotations)
      setLabels(nextLabels)
      setTasks(nextTasks)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void refreshData()
  }, [refreshData])

  useEffect(() => {
    let unlisten: (() => void) | undefined

    void listenToStudioEvents((event) => {
      const eventProjectId = event.projectId || event.project_id
      const isMatchingProjectEvent =
        event.entity === "projects" && event.id === projectId

      if (eventProjectId && eventProjectId !== projectId && !isMatchingProjectEvent) {
        return
      }
      if (!eventProjectId && event.entity !== "projects") {
        return
      }

      void refreshData()
    }, ["projects", "images", "annotations", "labels", "tasks"]).then(
      (cleanup) => {
        unlisten = cleanup
      }
    )

    return () => {
      unlisten?.()
    }
  }, [projectId, refreshData])

  const projectStats = useMemo(() => {
    const annotatedImages = new Set(annotations.map((item) => item.image_id)).size
    return {
      totalImages: images.length,
      annotatedImages,
      totalAnnotations: annotations.length,
      totalLabels: labels.length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((task) => task.status === "completed").length,
      progress: images.length ? Math.round((annotatedImages / images.length) * 100) : 0,
    }
  }, [annotations, images.length, labels.length, tasks])

  const handleFiles = async (files: File[]) => {
    setIsUploading(true)
    setUploadProgress(0)
    try {
      const preparedImages: UploadImage[] = []
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const data = await readFileAsDataURL(file)
        const dimensions = await getImageDimensions(data)
        preparedImages.push({
          id: uuidv4(),
          name: file.name,
          data,
          width: dimensions.width,
          height: dimensions.height,
          file,
          size: file.size,
          projectId,
          project_id: projectId,
        })
        setUploadProgress(Math.round(((index + 1) / files.length) * 100))
      }
      setNewImages((current) => [...current, ...preparedImages])
    } finally {
      setIsUploading(false)
    }
  }

  return {
    project,
    images,
    annotations,
    labels,
    tasks,
    activeTab,
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
    projectStats,
    annotationStats: [],
    recentActivity: [],
    projectName: project?.name || "Loading...",
    totalCount: images.length,
    labelCount: labels.length,
    pageSize: 20,
    setActiveTab,
    updateProject: async (updates: Partial<Project>) => {
      if (!project) return
      setIsEditingProject(true)
      try {
        const updatedProject = await services
          .getProjectService()
          .update(project.id, updates)
        setProject(updatedProject)
        setIsEditProjectModalOpen(false)
      } finally {
        setIsEditingProject(false)
      }
    },
    deleteProject: async () => {
      if (!project) return
      await services.getProjectService().delete(project.id)
      navigate("/projects")
    },
    updateProjectSettings: async (settings: Record<string, unknown>) => {
      if (!project) return
      const updatedProject = await services.getProjectService().update(project.id, {
        settings: {
          ...(project.settings ?? {}),
          ...settings,
        },
      })
      setProject(updatedProject)
    },
    exportProject: () => {},
    duplicateProject: async () => {},
    toggleImageSelection: () => {},
    toggleAnnotationSelection: () => {},
    clearSelections: () => {},
    getImageAnnotations: (imageId: string) =>
      annotations.filter((annotation) => annotation.image_id === imageId),
    getAnnotationLabel: (annotation: Annotation) =>
      labels.find((label) => label.id === annotation.label_id),
    getTaskProgress: (task: Task) => (task.status === "completed" ? 100 : 0),
    handleFiles,
    handleRemoveImage: (index: number) =>
      setNewImages((current) => current.filter((_, itemIndex) => itemIndex !== index)),
    saveImages: async () => {
      setIsSaving(true)
      try {
        const createdImages = await Promise.all(
          newImages.map((image) => services.getImageService().createImage(image))
        )
        setImages((current) => [...createdImages, ...current])
        setNewImages([])
      } finally {
        setIsSaving(false)
      }
    },
    navigateBack: () => navigate("/projects"),
    openEditProjectModal: () => setIsEditProjectModalOpen(true),
    closeEditProjectModal: () => setIsEditProjectModalOpen(false),
    refreshData,
    loadProjectData: refreshData,
    navigateToImage: (imageId: string) =>
      navigate(`/projects/${projectId}/studio/${imageId}`),
    deleteImage: async (imageId: string) => {
      await services.getImageService().deleteImage(imageId)
      setImages((current) => current.filter((image) => image.id !== imageId))
    },
    openAddLabelModal: () => setIsAddLabelModalOpen(true),
    closeAddLabelModal: () => setIsAddLabelModalOpen(false),
    createLabel: async (labelData: LabelCreateForm) => {
      setIsCreatingLabel(true)
      try {
        const createdLabel = await services.getLabelService().createLabel({
          id: uuidv4(),
          ...labelData,
          projectId,
          project_id: projectId,
        })
        setLabels((current) => [createdLabel, ...current])
        setIsAddLabelModalOpen(false)
      } finally {
        setIsCreatingLabel(false)
      }
    },
    deleteLabel: async (labelId: string) => {
      await services.getLabelService().deleteLabel(labelId)
      setLabels((current) => current.filter((label) => label.id !== labelId))
    },
  }
}

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
    const image = new Image()
    image.onload = () => resolve({ width: image.width, height: image.height })
    image.onerror = reject
    image.src = dataUrl
  })
}

