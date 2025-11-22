/**
 * Image Labeler ViewModel
 * Manages image labeling state and operations using React Query
 * Follows MVVM pattern with React Query as the binding layer
 */

import { useState, useMemo } from "react"
import { useMutation, useQueryClient } from "react-query"
import { useImage } from "@/hooks/api/image-hooks"
import {
  useAnnotationsByImage,
  useCreateAnnotation,
  useUpdateAnnotation,
  useDeleteAnnotation,
} from "@/hooks/api/annotation-hooks"
import { ImageData, Annotation } from "@vailabel/core"

export const useImageLabelerViewModel = (
  projectId?: string,
  imageId?: string
) => {
  const queryClient = useQueryClient()

  // State
  const [nextId, setNextId] = useState<string | null>(null)
  const [prevId, setPrevId] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)

  // Queries
  const {
    data: image,
    isLoading: imageLoading,
    error: imageError,
  } = useImage(imageId || "")
  const {
    data: annotations = [],
    isLoading: annotationsLoading,
    error: annotationsError,
    refetch: refreshAnnotations,
  } = useAnnotationsByImage(imageId || "")

  // Mutations
  const createAnnotationMutation = useCreateAnnotation()
  const updateAnnotationMutation = useUpdateAnnotation()
  const deleteAnnotationMutation = useDeleteAnnotation()

  // Computed values
  const isLoading = imageLoading || annotationsLoading
  const error = imageError || annotationsError

  // Actions
  const createAnnotation = async (annotation: Omit<Annotation, "id">) => {
    try {
      const result = await createAnnotationMutation.mutateAsync(annotation)
      return result
    } catch (error) {
      console.error("Failed to create annotation:", error)
      throw error
    }
  }

  const updateAnnotation = async (
    annotationId: string,
    updates: Partial<Annotation>
  ) => {
    try {
      await updateAnnotationMutation.mutateAsync({ id: annotationId, updates })
    } catch (error) {
      console.error("Failed to update annotation:", error)
      throw error
    }
  }

  const deleteAnnotation = async (annotationId: string) => {
    try {
      await deleteAnnotationMutation.mutateAsync(annotationId)
    } catch (error) {
      console.error("Failed to delete annotation:", error)
      throw error
    }
  }

  const goToNextImage = () => {
    // TODO: Implement next image navigation
    console.log("Navigate to next image")
  }

  const goToPreviousImage = () => {
    // TODO: Implement previous image navigation
    console.log("Navigate to previous image")
  }

  return {
    // State
    image: image || null,
    annotations,
    nextId,
    prevId,
    hasNext,
    hasPrevious,
    isLoading,
    error,

    // Actions
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    refreshAnnotations,
    goToNextImage,
    goToPreviousImage,

    // Mutation state
    createAnnotationMutation,
    updateAnnotationMutation,
    deleteAnnotationMutation,
  }
}
