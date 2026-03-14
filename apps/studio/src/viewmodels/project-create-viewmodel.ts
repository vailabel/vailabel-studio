import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { services } from "@/services"

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

export const ProjectDetailSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.string().min(1),
  labels: z
    .array(
      z.object({
        name: z.string(),
        color: z.string(),
      })
    )
    .min(1),
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
  const [step, setStep] = useState<Step>("details")
  const [images, setImages] = useState<ImageFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const handleFiles = async (files: File[]) => {
    setIsUploading(true)
    setUploadProgress(0)
    try {
      const nextImages: ImageFile[] = []
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const data = await readFileAsDataURL(file)
        const dimensions = await getImageDimensions(data)
        nextImages.push({
          id: uuidv4(),
          name: file.name,
          data,
          width: dimensions.width,
          height: dimensions.height,
          file,
          size: file.size,
        })
        setUploadProgress(Math.round(((index + 1) / files.length) * 100))
      }
      setImages((current) => [...current, ...nextImages])
    } finally {
      setIsUploading(false)
    }
  }

  const createProject = async (formData: ProjectDetailForm) => {
    setIsCreating(true)
    setError(null)
    try {
      const project = await services.getProjectService().create({
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
        metadata: {
          labelCount: formData.labels.length,
          imageCount: images.length,
        },
      })

      await Promise.all(
        formData.labels.map((label) =>
          services.getLabelService().createLabel({
            id: uuidv4(),
            name: label.name,
            color: label.color,
            projectId: project.id,
            project_id: project.id,
          })
        )
      )

      await Promise.all(
        images.map((image) =>
          services.getImageService().createImage({
            ...image,
            projectId: project.id,
            project_id: project.id,
          })
        )
      )

      navigate(`/projects/detail/${project.id}`)
    } catch (nextError) {
      setError(nextError)
      throw nextError
    } finally {
      setIsCreating(false)
    }
  }

  return {
    step,
    images,
    isUploading,
    uploadProgress,
    isCreating,
    error,
    goToNextStep: () => setStep("dataset"),
    goToPreviousStep: () => setStep("details"),
    handleFiles,
    handleRemoveImage: (index: number) =>
      setImages((current) => current.filter((_, itemIndex) => itemIndex !== index)),
    validateForm: (formData: ProjectDetailForm) => {
      const result = ProjectDetailSchema.safeParse(formData)
      if (result.success) return {}
      return Object.fromEntries(
        result.error.issues.map((issue) => [
          issue.path.join(".") || "form",
          issue.message,
        ])
      )
    },
    createProject,
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

function getAnnotationTypesForProjectType(type: string): string[] {
  switch (type) {
    case PROJECT_TYPES.OBJECT_DETECTION:
      return ["bbox"]
    case PROJECT_TYPES.SEGMENTATION:
      return ["polygon", "mask"]
    case PROJECT_TYPES.CLASSIFICATION:
      return ["classification"]
    default:
      return ["bbox", "polygon", "point"]
  }
}
