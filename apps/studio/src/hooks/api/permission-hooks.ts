/**
 * Permission Hooks
 * Permission-related React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { Permission } from "@vailabel/core"
import { apiClient, queryKeys } from "../api-client-config"

export function usePermissions() {
  return useQuery({
    queryKey: queryKeys.permissions,
    queryFn: () => apiClient.get<Permission[]>("/permissions/"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function usePermission(permissionId: string) {
  return useQuery({
    queryKey: queryKeys.permission(permissionId),
    queryFn: () => apiClient.get<Permission>(`/permissions/${permissionId}`),
    enabled: !!permissionId,
  })
}

export function useCreatePermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (permission: Omit<Permission, "id">) =>
      apiClient.post<Permission>("/permissions/", permission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions })
    },
  })
}

export function useUpdatePermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Permission>
    }) => apiClient.put<Permission>(`/permissions/${id}`, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permission(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions })
    },
  })
}

export function useDeletePermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (permissionId: string) =>
      apiClient.delete(`/permissions/${permissionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions })
    },
  })
}
