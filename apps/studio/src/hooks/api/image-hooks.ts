/**
 * Image Hooks
 * Image-related React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { ImageData } from "@vailabel/core"
import { apiClient, queryKeys } from "../api-client-config"

export function useImages(projectId: string) {
  return useQuery({
    queryKey: queryKeys.images(projectId),
    queryFn: async () => {
      try {
        return await apiClient.get<ImageData[]>(
          `/projects/${projectId}/images/`
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
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useImage(imageId: string) {
  return useQuery({
    queryKey: queryKeys.image(imageId),
    queryFn: () => apiClient.get<ImageData>(`/images/${imageId}`),
    enabled: !!imageId,
  })
}

export function useImageRange(
  projectId: string,
  offset: number,
  limit: number
) {
  return useQuery({
    queryKey: queryKeys.imageRange(projectId, offset, limit),
    queryFn: () =>
      apiClient.get<ImageData[]>(
        `/projects/${projectId}/images/?offset=${offset}&limit=${limit}`
      ),
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export function useCreateImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (image: Omit<ImageData, "id">) =>
      apiClient.post<ImageData>("/images/", image),
    onSuccess: (_, image) => {
      // Invalidate images for the project
      if (image.project_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.images(image.project_id),
        })
      }
    },
  })
}

export function useUpdateImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<ImageData>
    }) => apiClient.put<ImageData>(`/images/${id}`, updates),
    onSuccess: (_, { id, updates }) => {
      // Invalidate specific image and project images
      queryClient.invalidateQueries({ queryKey: queryKeys.image(id) })
      if (updates.project_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.images(updates.project_id),
        })
      }
    },
  })
}

export function useDeleteImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (imageId: string) => apiClient.delete(`/images/${imageId}`),
    onSuccess: () => {
      // Invalidate all image queries
      queryClient.invalidateQueries({ queryKey: ["images"] })
    },
  })
}
