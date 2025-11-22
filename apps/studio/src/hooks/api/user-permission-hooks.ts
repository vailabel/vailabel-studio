/**
 * User Permission Hooks
 * User permission-related React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { apiClient, queryKeys } from "../api-client-config"

export function useUserPermissions(userId: string) {
  return useQuery({
    queryKey: queryKeys.userPermissions(userId),
    queryFn: () => apiClient.get<string[]>(`/users/${userId}/permissions/`),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useAssignUserPermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      permissionIds,
    }: {
      userId: string
      permissionIds: string[]
    }) =>
      apiClient.post(`/users/${userId}/permissions/`, {
        permission_ids: permissionIds,
      }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.userPermissions(userId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser })
    },
  })
}

export function useAssignUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      apiClient.post(`/users/${userId}/role/`, { role_id: roleId }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.userPermissions(userId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser })
    },
  })
}
