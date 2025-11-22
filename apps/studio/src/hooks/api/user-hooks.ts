/**
 * User Hooks
 * User management-related React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { User } from "@vailabel/core"
import { apiClient, queryKeys } from "../api-client-config"

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: () => apiClient.get<User[]>("/users/"),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: () => apiClient.get<User>(`/users/${userId}`),
    enabled: !!userId,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (user: Omit<User, "id">) =>
      apiClient.post<User>("/users/", user),
    onSuccess: () => {
      // Invalidate and refetch users
      queryClient.invalidateQueries({ queryKey: queryKeys.users })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<User> }) =>
      apiClient.put<User>(`/users/${id}`, updates),
    onSuccess: (_, { id }) => {
      // Invalidate specific user and users list
      queryClient.invalidateQueries({ queryKey: queryKeys.user(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.users })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => apiClient.delete(`/users/${userId}`),
    onSuccess: (_, userId) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({ queryKey: queryKeys.user(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.users })
    },
  })
}
