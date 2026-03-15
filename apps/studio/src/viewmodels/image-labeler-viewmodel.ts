import { useCallback, useEffect, useMemo, useState } from "react"
import { Annotation, ImageData, Label, Prediction } from "@vailabel/core"
import { services } from "@/services"
import { listenToStudioEvents } from "@/ipc/events"

interface CreateAnnotationDraftInput {
  name: string
  color: string
  type: string
  coordinates: Array<{ x: number; y: number }>
}

export const useImageLabelerViewModel = (
  projectId?: string,
  imageId?: string
) => {
  const [image, setImage] = useState<ImageData | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [projectImages, setProjectImages] = useState<ImageData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const loadData = useCallback(async () => {
    if (!imageId) return

    setIsLoading(true)
    setError(null)
    try {
      const nextImage = await services.getImageService().getImage(imageId)
      const effectiveProjectId =
        projectId || nextImage.projectId || nextImage.project_id || ""

      const [nextAnnotations, nextPredictions, nextProjectImages, nextLabels] =
        await Promise.all([
          services.getAnnotationService().getAnnotationsByImageId(imageId),
          services.getPredictionService().listByImageId(imageId),
          effectiveProjectId
            ? services.getImageService().getImagesByProjectId(effectiveProjectId)
            : Promise.resolve([]),
          effectiveProjectId
            ? services.getLabelService().getLabelsByProjectId(effectiveProjectId)
            : Promise.resolve([]),
        ])

      setImage(nextImage)
      setAnnotations(nextAnnotations)
      setPredictions(nextPredictions)
      setProjectImages(nextProjectImages)
      setLabels(nextLabels)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsLoading(false)
    }
  }, [imageId, projectId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!imageId) return

    let unlisten: (() => void) | undefined
    void listenToStudioEvents(
      (event) => {
        const eventImageId = event.imageId || event.image_id
        const eventProjectId = event.projectId || event.project_id
        const activeProjectId =
          projectId || image?.projectId || image?.project_id || ""

        const matchesImage = !eventImageId || eventImageId === imageId
        const matchesProject =
          !eventProjectId || !activeProjectId || eventProjectId === activeProjectId

        if (matchesImage && matchesProject) {
          void loadData()
        }
      },
      ["annotations", "predictions", "labels", "images", "ai_models"]
    ).then((cleanup) => {
      unlisten = cleanup
    })

    return () => {
      unlisten?.()
    }
  }, [image?.projectId, image?.project_id, imageId, loadData, projectId])

  const currentImageIndex = useMemo(
    () => projectImages.findIndex((entry) => entry.id === imageId),
    [projectImages, imageId]
  )

  const prevImage = currentImageIndex > 0 ? projectImages[currentImageIndex - 1] : null
  const nextImage =
    currentImageIndex >= 0 && currentImageIndex < projectImages.length - 1
      ? projectImages[currentImageIndex + 1]
      : null

  const ensureLabel = useCallback(
    async (name: string, color: string) => {
      const effectiveProjectId =
        projectId || image?.projectId || image?.project_id || ""

      const existingLabel = labels.find(
        (entry) => entry.name.toLowerCase() === name.toLowerCase()
      )
      if (existingLabel) return existingLabel
      if (!effectiveProjectId) return null

      const createdLabel = await services.getLabelService().createLabel({
        name,
        color,
        isAIGenerated: true,
        projectId: effectiveProjectId,
        project_id: effectiveProjectId,
      })
      setLabels((current) => [createdLabel, ...current])
      return createdLabel
    },
    [image?.projectId, image?.project_id, labels, projectId]
  )

  const refreshAnnotations = useCallback(async () => {
    await loadData()
  }, [loadData])

  return {
    image,
    annotations,
    predictions,
    labels,
    nextId: nextImage?.id ?? null,
    prevId: prevImage?.id ?? null,
    hasNext: Boolean(nextImage),
    hasPrevious: Boolean(prevImage),
    isLoading,
    isGeneratingPredictions,
    error,
    createAnnotationFromDraft: async ({
      name,
      color,
      type,
      coordinates,
    }: CreateAnnotationDraftInput) => {
      if (!image) {
        throw new Error("No image is loaded.")
      }

      const label = await ensureLabel(name, color)
      const effectiveProjectId =
        projectId || image.projectId || image.project_id || ""

      const createdAnnotation = await services.getAnnotationService().createAnnotation({
        name,
        type,
        coordinates,
        imageId: image.id,
        image_id: image.id,
        projectId: effectiveProjectId,
        project_id: effectiveProjectId,
        labelId: label?.id,
        label_id: label?.id,
        color: label?.color ?? color,
        isAIGenerated: false,
      })

      setAnnotations((current) => [createdAnnotation, ...current])
      return createdAnnotation
    },
    createAnnotation: async (annotation: Omit<Annotation, "id">) => {
      const created = await services.getAnnotationService().createAnnotation(annotation)
      setAnnotations((current) => [created, ...current])
      return created
    },
    updateAnnotation: async (annotationId: string, updates: Partial<Annotation>) => {
      const updated = await services
        .getAnnotationService()
        .updateAnnotation(annotationId, updates)
      setAnnotations((current) =>
        current.map((annotation) =>
          annotation.id === annotationId ? updated : annotation
        )
      )
      return updated
    },
    deleteAnnotation: async (annotationId: string) => {
      await services.getAnnotationService().deleteAnnotation(annotationId)
      setAnnotations((current) =>
        current.filter((annotation) => annotation.id !== annotationId)
      )
    },
    generatePredictions: async (modelId: string, threshold?: number) => {
      if (!image) {
        throw new Error("No image selected")
      }

      setIsGeneratingPredictions(true)
      try {
        const nextPredictions = await services.getPredictionService().generate({
          imageId: image.id,
          modelId,
          threshold,
        })
        setPredictions(nextPredictions)
        return nextPredictions
      } finally {
        setIsGeneratingPredictions(false)
      }
    },
    acceptPrediction: async (predictionId: string) => {
      const createdAnnotation =
        await services.getPredictionService().accept(predictionId)
      setPredictions((current) =>
        current.filter((prediction) => prediction.id !== predictionId)
      )
      setAnnotations((current) => [createdAnnotation, ...current])
      await loadData()
      return createdAnnotation
    },
    rejectPrediction: async (predictionId: string) => {
      await services.getPredictionService().reject(predictionId)
      setPredictions((current) =>
        current.filter((prediction) => prediction.id !== predictionId)
      )
    },
    refreshAnnotations,
    goToNextImage: () => nextImage?.id ?? null,
    goToPreviousImage: () => prevImage?.id ?? null,
  }
}
