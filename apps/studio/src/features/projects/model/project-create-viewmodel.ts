import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { useNavigate } from "react-router-dom"
import { services } from "@/shared/services"
import type { Annotation } from "@/shared/types/core"
import type { Modality, Task } from "@/shared/types/modality"
import {
  allowImageDirectory,
  openPathDialog,
  scanImageDirectory,
  toAssetUrl,
} from "@/shared/lib/desktop"
import { importLabelMeSidecar } from "@/features/projects/model/labelme-sidecar"
import { parseLabelConfig } from "@/shared/lib/label-config/parse"
import { extractClasses } from "@/shared/lib/label-config/generate"
import {
  annotationTypesForTask,
  type ModalityDescriptor,
} from "@/features/projects/model/modality-registry"

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

function fileDirName(filePath: string): string {
  return filePath.replace(/[\\/][^\\/]*$/, "") || filePath
}

// Dropped image FILES bypass the directory scanner, so probe their natural size
// in the webview (via the asset URL) instead of the Rust image-dimensions call.
function probeImageSize(
  path: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = toAssetUrl(path)
  })
}

// Probe video metadata via the webview (fallback if ffprobe is unavailable).
function probeVideoMeta(
  assetUrl: string
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const el = document.createElement("video")
    el.preload = "metadata"
    el.muted = true
    el.src = assetUrl
    el.onloadedmetadata = () => {
      resolve({
        duration: Number.isFinite(el.duration) ? el.duration : 0,
        width: el.videoWidth,
        height: el.videoHeight,
      })
      el.removeAttribute("src")
      el.load()
    }
    el.onerror = () => resolve({ duration: 0, width: 0, height: 0 })
  })
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
  // For custom (config-driven) projects: the JSON/XML labeling config.
  const [labelConfig, setLabelConfig] = useState<string>("")
  const [images, setImages] = useState<ImageFile[]>([])
  const [documents, setDocuments] = useState<DocumentFile[]>([])
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

  // Non-image projects reference picked files in place (one file = one item),
  // mirroring the image "reference, never copy" model. A directory scan would
  // need a backend command, so we pick files directly via the native dialog.
  // `grantScope` opens asset-protocol access so media (audio/video) can be
  // fetched/played in the editor.
  const openMediaFiles = async (extensions: string[], grantScope = false) => {
    const paths = await openPathDialog({
      multiple: true,
      filters: [{ name: "Files", extensions }],
    })
    if (!paths || paths.length === 0) return

    setError(null)
    if (grantScope) {
      const dirs = new Set(paths.map(fileDirName))
      await Promise.all(
        [...dirs].map((dir) => allowImageDirectory(dir).catch(() => {}))
      )
    }
    const nextDocuments: DocumentFile[] = paths.map((path) => ({
      id: uuidv4(),
      name: fileBaseName(path),
      path,
    }))
    setDocuments(nextDocuments)
    setName((current) => current.trim() || "Dataset")
  }

  // Single entry point the Data step calls: the modality descriptor decides how
  // items are imported (folder scan vs. file pick vs. nothing for video, whose
  // clips are imported inside the editor). No per-modality branching at the call
  // site — adding a modality = adding a descriptor.
  const openImport = (descriptor: ModalityDescriptor) => {
    if (descriptor.importMode === "folder") return openImageFolder()
    if (descriptor.importMode === "files")
      return openMediaFiles(descriptor.extensions, descriptor.grantScope)
    // "none" → clips are imported later, in the editor; nothing to do here.
  }

  const removeDocument = (index: number) =>
    setDocuments((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    )

  // Drop all imported items (used when the project's data kind changes, so a
  // text project can't keep stale images and vice versa).
  const clearData = () => {
    setImages([])
    setDocuments([])
    setFolderPath(null)
  }

  // Drag & drop: add image FILES (dimensions probed in the webview) without
  // going through the folder scanner. Dedupes against already-added paths.
  const addImagePaths = async (paths: string[]) => {
    // The Data step already filtered to the image descriptor's extensions.
    const picked = paths
    if (picked.length === 0) return
    setError(null)
    const dirs = new Set(picked.map(fileDirName))
    await Promise.all(
      [...dirs].map((dir) => allowImageDirectory(dir).catch(() => {}))
    )
    const probed = await Promise.all(
      picked.map(async (path) => {
        const { width, height } = await probeImageSize(path)
        return {
          id: uuidv4(),
          name: fileBaseName(path),
          path,
          imagePath: fileBaseName(path),
          width,
          height,
        }
      })
    )
    setImages((current) => {
      const seen = new Set(current.map((image) => image.path))
      return [...current, ...probed.filter((image) => !seen.has(image.path))]
    })
    setName((current) => current.trim() || "Image dataset")
  }

  // Drag & drop: add document/media FILES (text or audio) referenced in place.
  // `grantScope` opens asset access for playable media (audio). Dedupes by path.
  const addDocumentPaths = async (paths: string[], grantScope = false) => {
    if (paths.length === 0) return
    setError(null)
    if (grantScope) {
      const dirs = new Set(paths.map(fileDirName))
      await Promise.all(
        [...dirs].map((dir) => allowImageDirectory(dir).catch(() => {}))
      )
    }
    setDocuments((current) => {
      const seen = new Set(current.map((doc) => doc.path))
      const next = paths
        .filter((path) => !seen.has(path))
        .map((path) => ({ id: uuidv4(), name: fileBaseName(path), path }))
      return [...current, ...next]
    })
    setName((current) => current.trim() || "Dataset")
  }

  const createProject = async (descriptor?: ModalityDescriptor) => {
    // Use whichever importer was populated (image folder or picked files), so a
    // custom project can be image- or file-based depending on its config.
    // Deferred-import modalities (video, `importMode: "none"`) import/annotate
    // their clips inside the studio editor, so they create no generic items here.
    const deferItems = descriptor?.importMode === "none"
    const usingImages = images.length > 0
    const itemCount = usingImages ? images.length : documents.length
    if (!name.trim()) return
    if (!deferItems && itemCount === 0) return

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
          // Image tasks split tools by task; other modalities use the
          // descriptor's fixed set (this metadata is informational only).
          annotationTypes:
            modality === "image"
              ? annotationTypesForTask(task)
              : descriptor?.annotationTypes ?? annotationTypesForTask(task),
          autoSave: true,
          // The labeling config is the single source of truth (Label Studio
          // style) — persist it for every project. Custom projects render from
          // it; native editors read the derived Label classes and ignore it.
          ...(labelConfig.trim() ? { labelConfig } : {}),
        },
        metadata: {
          imageCount: itemCount,
          sourceFolder: folderPath,
        },
      })

      // Derive the project's label classes from the config and persist them as
      // Label entities (what the native image/text/audio editors read).
      let derivedClasses: { name: string; color: string }[] = []
      try {
        derivedClasses = extractClasses(parseLabelConfig(labelConfig))
      } catch {
        derivedClasses = []
      }
      await Promise.all(
        derivedClasses.map((cls) =>
          services.getLabelService().createLabel({
            id: uuidv4(),
            name: cls.name,
            color: cls.color,
            projectId: project.id,
            project_id: project.id,
          })
        )
      )

      // Deferred-import modalities (video): project + labels are created; clips
      // are imported inside the studio's video editor (its FFmpeg pipeline). Drop
      // straight into the studio shell with no item — the video editor mounts the
      // clip library so the user imports/processes clips there.
      if (deferItems) {
        navigate(`/projects/${project.id}/studio`)
        return
      }

      // Video clips use the dedicated video service — probe metadata in the
      // webview then call video.import for each selected file, then open studio.
      if (modality === "video" && documents.length > 0) {
        for (const doc of documents) {
          const probe = await probeVideoMeta(toAssetUrl(doc.path))
          await services.getVideoService().import({
            projectId: project.id,
            name: doc.name,
            path: doc.path,
            ...probe,
          })
        }
        navigate(`/projects/${project.id}/studio`)
        return
      }

      // Non-image items ride on the same entity (ImageData) as images —
      // `path` points at the file; width/height are unused for text/audio.
      const itemDrafts = usingImages
        ? images
        : documents.map((doc) => ({
            id: doc.id,
            name: doc.name,
            path: doc.path,
            imagePath: doc.name,
            width: 0,
            height: 0,
          }))

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
      // (image projects only — picked files have no sidecars).
      if (modality === "image") {
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
    labelConfig,
    setLabelConfig,
    images,
    documents,
    folderPath,
    isScanning,
    isCreating,
    error,
    canCreate:
      name.trim().length > 0 &&
      (images.length > 0 || documents.length > 0),
    openImport,
    removeImage,
    addImagePaths,
    addDocumentPaths,
    removeDocument,
    clearData,
    createProject,
    cancel: () => navigate("/projects"),
  }
}
