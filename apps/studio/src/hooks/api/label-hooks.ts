/**
 * Label Hooks
 * Label-related React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { Label } from "@vailabel/core"
import { apiClient, queryKeys } from "../api-client-config"

export function useLabels(projectId: string) {
  return useQuery({
    queryKey: queryKeys.labels(projectId),
    queryFn: async () => {
      try {
        return await apiClient.get<Label[]>(`/projects/${projectId}/labels/`)
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

export function useCreateLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (label: Omit<Label, "id">) =>
      apiClient.post<Label>("/labels/", label),
    onSuccess: (_, label) => {
      // Invalidate labels for the project
      if (label.project_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.labels(label.project_id),
        })
      }
    },
  })
}

export function useUpdateLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Label> }) =>
      apiClient.put<Label>(`/labels/${id}`, updates),
    onSuccess: (_, { updates }) => {
      // Invalidate labels for the project
      if (updates.project_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.labels(updates.project_id),
        })
      }
    },
  })
}

export function useDeleteLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (labelId: string) => apiClient.delete(`/labels/${labelId}`),
    onSuccess: () => {
      // Invalidate all label queries
      queryClient.invalidateQueries({ queryKey: ["labels"] })
    },
  })
}
