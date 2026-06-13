import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { useNavigate } from "react-router-dom"
import { services } from "@/services"
import type { Annotation } from "@/types/core"
import {
  allowImageDirectory,
  openPathDialog,
  scanImageDirectory,
} from "@/lib/desktop"
import { importLabelMeSidecar } from "@/lib/labelme-sidecar"

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

interface ImageFile {
  id: string
  name: string
  path: string
  imagePath?: string
  width: number
  height: number
  size?: number
}

function folderBaseName(folder: string): string {
  return (
    folder
      .split(/[\\/]/)
      .filter(Boolean)
      .pop() || "Untitled Project"
  )
}

export const useProjectCreateViewModel = () => {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<string>(PROJECT_TYPES.IMAGE_ANNOTATION)
  const [images, setImages] = useState<ImageFile[]>([])
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)

  // LabelMe-style: pick a folder, reference its images in place (no base64).
  const openImageFolder = async () => {
    const [folder] = await openPathDialog({ directory: true })
    if (!folder) return

    setIsScanning(true)
    setError(null)
    try {
      await allowImageDirectory(folder)
      const scanned = await scanImageDirectory(folder)
      const nextImages: ImageFile[] = scanned.map((image) => ({
        id: uuidv4(),
        name: image.name,
        path: image.path,
        imagePath: image.name,
        width: image.width,
        height: image.height,
      }))
      setImages(nextImages)
      setFolderPath(folder)
      setName((current) => current.trim() || folderBaseName(folder))
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsScanning(false)
    }
  }

  const removeImage = (index: number) =>
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))

  const createProject = async () => {
    if (!name.trim() || images.length === 0) return

    setIsCreating(true)
    setError(null)
    try {
      const project = await services.getProjectService().create({
        id: uuidv4(),
        name: name.trim(),
        description: description.trim(),
        type,
        status: "active",
        settings: {
          annotationTypes: getAnnotationTypesForProjectType(type),
          autoSave: true,
        },
        metadata: {
          imageCount: images.length,
          sourceFolder: folderPath,
        },
      })

      const createdImages = await Promise.all(
        images.map((image) =>
          services.getImageService().createImage({
            ...image,
            projectId: project.id,
            project_id: project.id,
          })
        )
      )

      // Hydrate annotations from any LabelMe sidecars already in the folder.
      await Promise.all(
        createdImages.map(async (image) => {
          try {
            const drafts = await importLabelMeSidecar(image, project.id)
            await Promise.all(
              drafts.map((draft) =>
                services
                  .getAnnotationService()
                  .createAnnotation({ id: uuidv4(), ...draft } as Annotation)
              )
            )
          } catch (sidecarError) {
            console.error("Failed to import sidecar for", image.name, sidecarError)
          }
        })
      )

      // Drop straight into annotating the first image (LabelMe behaviour).
      const firstImage = createdImages[0]
      if (firstImage) {
        navigate(`/projects/${project.id}/studio/${firstImage.id}`)
      } else {
        navigate(`/projects/detail/${project.id}`)
      }
    } catch (nextError) {
      setError(nextError)
      throw nextError
    } finally {
      setIsCreating(false)
    }
  }

  return {
    name,
    setName,
    description,
    setDescription,
    type,
    setType,
    images,
    folderPath,
    isScanning,
    isCreating,
    error,
    canCreate: name.trim().length > 0 && images.length > 0,
    openImageFolder,
    removeImage,
    createProject,
    cancel: () => navigate("/projects"),
  }
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
