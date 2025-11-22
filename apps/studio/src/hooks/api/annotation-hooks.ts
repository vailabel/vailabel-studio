/**
 * Annotation Hooks
 * Annotation-related React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { Annotation } from "@vailabel/core"
import { apiClient, queryKeys } from "../api-client-config"

export function useAnnotations(projectId: string) {
  return useQuery({
    queryKey: queryKeys.annotations(projectId),
    queryFn: async () => {
      try {
        return await apiClient.get<Annotation[]>(
          `/projects/${projectId}/annotations/`
        )
      } catch (error: unknown) {
        // Handle 404 gracefully - return empty array for new projects
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        if (
          errorMessage.includes("404") ||
          errorMessage.includes("Not Found")
        ) {
          return []
        }
        throw error
      }
    },
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export function useAnnotationsByImage(imageId: string) {
  return useQuery({
    queryKey: queryKeys.annotationsByImage(imageId),
    queryFn: () =>
      apiClient.get<Annotation[]>(`/images/${imageId}/annotations/`),
    enabled: !!imageId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useCreateAnnotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (annotation: Omit<Annotation, "id">) =>
      apiClient.post<Annotation>("/annotations/", annotation),
    onSuccess: (_, annotation) => {
      // Invalidate annotations for the image and project
      if (annotation.image_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.annotationsByImage(annotation.image_id),
        })
      }
    },
  })
}

export function useUpdateAnnotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Annotation>
    }) => apiClient.put<Annotation>(`/annotations/${id}`, updates),
    onSuccess: (_, { id, updates }) => {
      // Invalidate specific annotation and related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.annotation(id) })
      if (updates.image_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.annotationsByImage(updates.image_id),
        })
      }
    },
  })
}

export function useDeleteAnnotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (annotationId: string) =>
      apiClient.delete(`/annotations/${annotationId}`),
    onSuccess: () => {
      // Invalidate all annotation queries
      queryClient.invalidateQueries({ queryKey: ["annotations"] })
    },
  })
}
