import { useEffect, useMemo, useState } from "react"
import { Annotation, ImageData } from "@vailabel/core"
import { services } from "@/services"

export const useImageLabelerViewModel = (
  projectId?: string,
  imageId?: string
) => {
  const [image, setImage] = useState<ImageData | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [projectImages, setProjectImages] = useState<ImageData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const refreshAnnotations = async () => {
    if (!imageId) return
    setAnnotations(
      await services.getAnnotationService().getAnnotationsByImageId(imageId)
    )
  }

  useEffect(() => {
    const load = async () => {
      if (!imageId) return
      setIsLoading(true)
      setError(null)
      try {
        const nextImage = await services.getImageService().getImage(imageId)
        setImage(nextImage)
        const effectiveProjectId =
          projectId || nextImage.projectId || nextImage.project_id || ""
        const [nextAnnotations, nextProjectImages] = await Promise.all([
          services.getAnnotationService().getAnnotationsByImageId(imageId),
          effectiveProjectId
            ? services.getImageService().getImagesByProjectId(effectiveProjectId)
            : Promise.resolve([]),
        ])
        setAnnotations(nextAnnotations)
        setProjectImages(nextProjectImages)
      } catch (nextError) {
        setError(nextError)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [imageId, projectId])

  const currentImageIndex = useMemo(
    () => projectImages.findIndex((entry) => entry.id === imageId),
    [projectImages, imageId]
  )

  const prevImage = currentImageIndex > 0 ? projectImages[currentImageIndex - 1] : null
  const nextImage =
    currentImageIndex >= 0 && currentImageIndex < projectImages.length - 1
      ? projectImages[currentImageIndex + 1]
      : null

  return {
    image,
    annotations,
    nextId: nextImage?.id ?? null,
    prevId: prevImage?.id ?? null,
    hasNext: Boolean(nextImage),
    hasPrevious: Boolean(prevImage),
    isLoading,
    error,
    createAnnotation: (annotation: Omit<Annotation, "id">) =>
      services.getAnnotationService().createAnnotation(annotation),
    updateAnnotation: (annotationId: string, updates: Partial<Annotation>) =>
      services.getAnnotationService().updateAnnotation(annotationId, updates),
    deleteAnnotation: (annotationId: string) =>
      services.getAnnotationService().deleteAnnotation(annotationId),
    refreshAnnotations,
    goToNextImage: () => nextImage?.id ?? null,
    goToPreviousImage: () => prevImage?.id ?? null,
  }
}
