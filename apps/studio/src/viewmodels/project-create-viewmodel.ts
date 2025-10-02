/**
 * Project Create ViewModel
 * Manages project creation state and operations using React Query
 * Follows MVVM pattern with React Query as the binding layer
 */

import { useState } from "react"
import { useCreateProject } from "@/hooks/useFastAPIQuery"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"
import { useNavigate } from "react-router-dom"

// Project types enum
export const PROJECT_TYPES = {
  IMAGE_ANNOTATION: "image_annotation",
  VIDEO_ANNOTATION: "video_annotation",
  TEXT_ANNOTATION: "text_annotation",
  AUDIO_ANNOTATION: "audio_annotation",
  DOCUMENT_ANNOTATION: "document_annotation",
  OBJECT_DETECTION: "object_detection",
  SEGMENTATION: "segmentation",
  CLASSIFICATION: "classification",
} as const

export type ProjectType = (typeof PROJECT_TYPES)[keyof typeof PROJECT_TYPES]

// Schema for project creation
export const ProjectDetailSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  type: z.string().min(1, "Project type is required"),
  labels: z
    .array(
      z.object({
        name: z.string(),
        color: z.string(),
      })
    )
    .min(1, "At least one label is required"),
})

export type ProjectDetailForm = z.infer<typeof ProjectDetailSchema>

interface ImageFile {
  id: string
  name: string
  data: string
  width: number
  height: number
  file?: File
  size?: number
}

type Step = "details" | "dataset"

export const useProjectCreateViewModel = () => {
  const navigate = useNavigate()
  const createProjectMutation = useCreateProject()

  const [step, setStep] = useState<Step>("details")
  const [images, setImages] = useState<ImageFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Navigation
  const goToNextStep = () => {
    setStep("dataset")
  }

  const goToPreviousStep = () => {
    setStep("details")
  }

  // Image handling
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

      setImages((prev) => [...prev, ...newImages])
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
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Form validation
  const validateForm = (formData: ProjectDetailForm) => {
    const errors: Record<string, string> = {}

    if (!formData.name || formData.name.trim().length === 0) {
      errors.name = "Project name is required"
    } else if (formData.name.length < 3) {
      errors.name = "Project name must be at least 3 characters"
    } else if (formData.name.length > 100) {
      errors.name = "Project name must be less than 100 characters"
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = "Description must be less than 500 characters"
    }

    if (!formData.type) {
      errors.type = "Project type is required"
    }

    if (!formData.labels || formData.labels.length === 0) {
      errors.labels = "At least one label is required"
    }

    return errors
  }

  // Project creation
  const createProject = async (formData: ProjectDetailForm) => {
    const validationErrors = validateForm(formData)

    if (Object.keys(validationErrors).length > 0) {
      throw new Error("Form validation failed")
    }

    try {
      // Create project
      const projectData = {
        id: uuidv4(),
        name: formData.name.trim(),
        description: formData.description?.trim() || "",
        type: formData.type,
        status: "active",
        settings: {
          annotationTypes: getAnnotationTypesForProjectType(formData.type),
          autoSave: true,
          showGrid: false,
          gridSize: 20,
        },
        projectMetadata: {
          labelCount: formData.labels.length,
          imageCount: images.length,
        },
      }

      const project = await createProjectMutation.mutateAsync(projectData)

      // Note: In a real application, you would also upload images and create labels here
      // For now, we'll just navigate to the project detail page

      navigate(`/projects/detail/${project.id}`)
    } catch (error) {
      console.error("Failed to create project:", error)
      throw error
    }
  }

  return {
    // State
    step,
    images,
    isUploading,
    uploadProgress,
    isCreating: createProjectMutation.isLoading,
    error: createProjectMutation.error,

    // Navigation
    goToNextStep,
    goToPreviousStep,

    // Image handling
    handleFiles,
    handleRemoveImage,

    // Form actions
    validateForm,
    createProject,

    // Mutation state
    createProjectMutation,
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

function getAnnotationTypesForProjectType(type: string): string[] {
  switch (type) {
    case PROJECT_TYPES.OBJECT_DETECTION:
      return ["bbox"]
    case PROJECT_TYPES.SEGMENTATION:
      return ["polygon", "mask"]
    case PROJECT_TYPES.CLASSIFICATION:
      return ["classification"]
    case PROJECT_TYPES.IMAGE_ANNOTATION:
    default:
      return ["bbox", "polygon", "point"]
  }
}
