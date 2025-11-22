/**
 * Settings Hooks
 * Settings-related React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { Settings } from "@vailabel/core"
import { apiClient, queryKeys } from "../api-client-config"

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => apiClient.get<Settings[]>("/settings/"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useSetting(key: string) {
  return useQuery({
    queryKey: queryKeys.setting(key),
    queryFn: () =>
      apiClient
        .get<Settings[]>(`/settings/?key=${key}`)
        .then((settings) => settings[0]),
    enabled: !!key,
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Omit<Settings, "id">) =>
      apiClient.post<Settings>("/settings/", settings),
    onSuccess: (_, settings) => {
      // Invalidate settings queries
      queryClient.invalidateQueries({ queryKey: queryKeys.settings })
      queryClient.invalidateQueries({
        queryKey: queryKeys.setting(settings.key),
      })
    },
  })
}
