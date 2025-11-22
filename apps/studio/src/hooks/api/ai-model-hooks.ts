/**
 * AI Model Hooks
 * AI Model-related React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { AIModel } from "@vailabel/core"
import { apiClient, queryKeys } from "../api-client-config"

export function useAIModels(projectId: string) {
  return useQuery({
    queryKey: queryKeys.aiModels(projectId),
    queryFn: () =>
      apiClient.get<AIModel[]>(`/projects/${projectId}/ai-models/`),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreateAIModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (aiModel: Omit<AIModel, "id">) =>
      apiClient.post<AIModel>("/ai-models/", aiModel),
    onSuccess: () => {
      // Invalidate all AI model queries
      queryClient.invalidateQueries({ queryKey: ["aiModels"] })
    },
  })
}

export function useUpdateAIModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AIModel> }) =>
      apiClient.put<AIModel>(`/ai-models/${id}`, updates),
    onSuccess: (_, { id }) => {
      // Invalidate specific AI model and related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.aiModel(id) })
      queryClient.invalidateQueries({ queryKey: ["aiModels"] })
    },
  })
}

export function useDeleteAIModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (aiModelId: string) =>
      apiClient.delete(`/ai-models/${aiModelId}`),
    onSuccess: () => {
      // Invalidate all AI model queries
      queryClient.invalidateQueries({ queryKey: ["aiModels"] })
    },
  })
}
