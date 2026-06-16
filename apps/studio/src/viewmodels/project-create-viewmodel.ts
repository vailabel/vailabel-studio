import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { useNavigate } from "react-router-dom"
import { services } from "@/services"
import type { Annotation } from "@/types/core"
import type { Modality, Task } from "@/types/modality"
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

/** A non-image item (a text document) referenced in place, like images. */
interface DocumentFile {
  id: string
  name: string
  path: string
}

function folderBaseName(folder: string): string {
  return (
    folder
      .split(/[\\/]/)
      .filter(Boolean)
      .pop() || "Untitled Project"
  )
}

function fileBaseName(filePath: string): string {
  return (
    filePath
      .split(/[\\/]/)
      .filter(Boolean)
      .pop() || filePath
  )
}

export const useProjectCreateViewModel = () => {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<string>(PROJECT_TYPES.IMAGE_ANNOTATION)
  // Two-axis taxonomy stored on the project so the studio shell mounts the right
  // editor (image canvas vs. text labeler). Defaults match a legacy image project.
  const [modality, setModality] = useState<Modality>("image")
  const [task, setTask] = useState<Task>("detection")
  const [images, setImages] = useState<ImageFile[]>([])
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [classes, setClasses] = useState<
    { id: string; name: string; color: string }[]
  >([])
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const isTextProject = modality === "text"

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

  // Text projects reference plain-text documents in place (one file = one item),
  // mirroring the image "reference, never copy" model. A directory scan would
  // need a backend command, so we pick files directly via the native dialog.
  const openTextFiles = async () => {
    const paths = await openPathDialog({
      multiple: true,
      filters: [{ name: "Text", extensions: ["txt", "md", "text"] }],
    })
    if (!paths || paths.length === 0) return

    setError(null)
    const nextDocuments: DocumentFile[] = paths.map((path) => ({
      id: uuidv4(),
      name: fileBaseName(path),
      path,
    }))
    setDocuments(nextDocuments)
    setName((current) => current.trim() || "Text dataset")
  }

  const removeDocument = (index: number) =>
    setDocuments((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    )

  // Labeling setup: pre-define label classes (Label Studio style). Optional —
  // classes can still be created on the fly while annotating.
  const addClass = (name: string, color: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setClasses((current) =>
      current.some((cls) => cls.name.toLowerCase() === trimmed.toLowerCase())
        ? current
        : [...current, { id: uuidv4(), name: trimmed, color }]
    )
  }

  const removeClass = (id: string) =>
    setClasses((current) => current.filter((cls) => cls.id !== id))

  const createProject = async () => {
    const itemCount = isTextProject ? documents.length : images.length
    if (!name.trim() || itemCount === 0) return

    setIsCreating(true)
    setError(null)
    try {
      const project = await services.getProjectService().create({
        id: uuidv4(),
        name: name.trim(),
        description: description.trim(),
        type,
        modality,
        task,
        status: "active",
        settings: {
          annotationTypes: getAnnotationTypesForProjectType(type),
          autoSave: true,
        },
        metadata: {
          imageCount: itemCount,
          sourceFolder: folderPath,
        },
      })

      // Create the label classes defined during labeling setup.
      await Promise.all(
        classes.map((cls) =>
          services.getLabelService().createLabel({
            id: cls.id,
            name: cls.name,
            color: cls.color,
            projectId: project.id,
            project_id: project.id,
          })
        )
      )

      // Text documents ride on the same item entity (ImageData) as images —
      // `path` points at the .txt file; width/height are unused for text.
      const itemDrafts = isTextProject
        ? documents.map((doc) => ({
            id: doc.id,
            name: doc.name,
            path: doc.path,
            imagePath: doc.name,
            width: 0,
            height: 0,
          }))
        : images

      const createdImages = await Promise.all(
        itemDrafts.map((item) =>
          services.getImageService().createImage({
            ...item,
            projectId: project.id,
            project_id: project.id,
          })
        )
      )

      // Hydrate annotations from any LabelMe sidecars already in the folder
      // (image projects only — text documents have no sidecars).
      if (!isTextProject) {
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
      }

      // Drop straight into annotating the first item (LabelMe behaviour).
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
    modality,
    setModality,
    task,
    setTask,
    isTextProject,
    images,
    documents,
    classes,
    addClass,
    removeClass,
    folderPath,
    isScanning,
    isCreating,
    error,
    canCreate:
      name.trim().length > 0 &&
      (isTextProject ? documents.length > 0 : images.length > 0),
    openImageFolder,
    removeImage,
    openTextFiles,
    removeDocument,
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
    case PROJECT_TYPES.TEXT_ANNOTATION:
      return ["span", "classification"]
    default:
      return ["bbox", "polygon", "point"]
  }
}
