/**
 * Canvas ViewModel
 * Manages canvas state and operations using React Query
 * Follows MVVM pattern with React Query as the binding layer
 */

import { useState, useMemo, useCallback } from "react"
import { useMutation, useQueryClient } from "react-query"
import {
  useLabels,
  useCreateLabel,
  useCreateAnnotation,
  useUpdateAnnotation,
  useDeleteAnnotation,
} from "@/hooks/useFastAPIQuery"
import { ImageData, Annotation, Label } from "@vailabel/core"

export const useCanvasViewModel = (image: ImageData | null) => {
  const queryClient = useQueryClient()

  // State
  const [tempAnnotation, setTempAnnotation] =
    useState<Partial<Annotation> | null>(null)
  const [showLabelInput, setShowLabelInput] = useState(false)

  // Queries
  const { data: labels = [] } = useLabels(image?.projectId || "")

  // Mutations
  const createLabelMutation = useCreateLabel()
  const createAnnotationMutation = useCreateAnnotation()
  const updateAnnotationMutation = useUpdateAnnotation()
  const deleteAnnotationMutation = useDeleteAnnotation()

  // Actions
  const createAnnotation = useCallback(
    async (name: string, color: string) => {
      if (!tempAnnotation || !image?.projectId) return

      try {
        // Get or create label
        let label = labels.find((l) => l.name === name)

        if (!label) {
          // Create new label
          const newLabel = {
            name: name,
            color: color,
            projectId: image.projectId,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          const createdLabel = await createLabelMutation.mutateAsync(newLabel)
          label = createdLabel
        }

        if (!label) return

        const newAnnotation: Omit<Annotation, "id"> = {
          label: label,
          labelId: label.id,
          color: label.color ?? color,
          imageId: image.id,
          name: name,
          type: tempAnnotation.type ?? "box",
          coordinates: tempAnnotation.coordinates ?? [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const result = await createAnnotationMutation.mutateAsync(newAnnotation)

        // Clear temp annotation and close input
        setTempAnnotation(null)
        setShowLabelInput(false)

        return result
      } catch (error) {
        console.error("Failed to create annotation:", error)
        throw error
      }
    },
    [
      tempAnnotation,
      image,
      labels,
      createLabelMutation,
      createAnnotationMutation,
    ]
  )

  const updateAnnotation = useCallback(
    async (annotationId: string, updates: Partial<Annotation>) => {
      try {
        await updateAnnotationMutation.mutateAsync({
          id: annotationId,
          updates,
        })
      } catch (error) {
        console.error("Failed to update annotation:", error)
        throw error
      }
    },
    [updateAnnotationMutation]
  )

  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      try {
        await deleteAnnotationMutation.mutateAsync(annotationId)
      } catch (error) {
        console.error("Failed to delete annotation:", error)
        throw error
      }
    },
    [deleteAnnotationMutation]
  )

  const startAnnotation = useCallback((annotation: Partial<Annotation>) => {
    setTempAnnotation(annotation)
    setShowLabelInput(true)
  }, [])

  const cancelAnnotation = useCallback(() => {
    setTempAnnotation(null)
    setShowLabelInput(false)
  }, [])

  return {
    // State
    labels,
    tempAnnotation,
    showLabelInput,

    // Actions
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    startAnnotation,
    cancelAnnotation,

    // Mutation state
    createLabelMutation,
    createAnnotationMutation,
    updateAnnotationMutation,
    deleteAnnotationMutation,
  }
}
