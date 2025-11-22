/**
 * History Hooks
 * History-related React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { History } from "@vailabel/core"
import { apiClient, queryKeys } from "../api-client-config"

export function useHistory(projectId: string) {
  return useQuery({
    queryKey: queryKeys.history(projectId),
    queryFn: () => apiClient.get<History[]>(`/projects/${projectId}/history/`),
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export function useCreateHistory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (history: Omit<History, "id">) =>
      apiClient.post<History>("/history/", history),
    onSuccess: (_, history) => {
      // Invalidate history for the project
      if (history.project_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.history(history.project_id),
        })
      }
    },
  })
}
