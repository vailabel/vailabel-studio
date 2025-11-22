/**
 * Sync Hooks
 * Sync-related React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { apiClient, queryKeys } from "../api-client-config"

export function useSyncStatus() {
  return useQuery({
    queryKey: queryKeys.syncStatus,
    queryFn: () => apiClient.get("/sync/status"),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export function useSyncUserData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.post("/sync/data"),
    onSuccess: () => {
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries()
    },
  })
}

export function useSyncProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) =>
      apiClient.post(`/sync/project/${projectId}`),
    onSuccess: (_, projectId) => {
      // Invalidate project-specific queries
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.images(projectId) })
      queryClient.invalidateQueries({
        queryKey: queryKeys.annotations(projectId),
      })
    },
  })
}
