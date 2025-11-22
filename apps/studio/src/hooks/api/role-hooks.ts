/**
 * Role Hooks
 * Role-related React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { Role } from "@vailabel/core"
import { apiClient, queryKeys } from "../api-client-config"

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.roles,
    queryFn: () => apiClient.get<Role[]>("/permissions/roles/"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useRole(roleId: string) {
  return useQuery({
    queryKey: queryKeys.role(roleId),
    queryFn: () => apiClient.get<Role>(`/permissions/roles/${roleId}`),
    enabled: !!roleId,
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (role: Omit<Role, "id">) =>
      apiClient.post<Role>("/permissions/roles/", role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles })
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Role> }) =>
      apiClient.put<Role>(`/permissions/roles/${id}`, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.role(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.roles })
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roleId: string) =>
      apiClient.delete(`/permissions/roles/${roleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles })
    },
  })
}
