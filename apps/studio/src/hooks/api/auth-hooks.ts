/**
 * Auth Hooks
 * Authentication-related React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { User } from "@vailabel/core"
import { apiClient, queryKeys } from "../api-client-config"

export function useCurrentUser() {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => apiClient.get<User>("/auth/me"),
    retry: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!localStorage.getItem("authToken"), // Only run if we have a token
    onError: (error: unknown) => {
      // If we get a 401, the token is invalid, so clear it
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (
        errorMessage.includes("401") ||
        errorMessage.includes("Unauthorized")
      ) {
        localStorage.removeItem("authToken")
        queryClient.setQueryData(queryKeys.currentUser, null)
      }
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiClient.post<{ access_token: string; token_type: string; user: User }>(
        "/auth/login",
        { email, password }
      ),
    onSuccess: (response) => {
      // Store the token in localStorage
      localStorage.setItem("authToken", response.access_token)
      // Update the current user cache
      queryClient.setQueryData(queryKeys.currentUser, response.user)
    },
    onError: (error) => {
      console.error("Login failed:", error)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.post("/auth/logout"),
    onSuccess: () => {
      // Clear the token from localStorage
      localStorage.removeItem("authToken")
      // Clear all cached data
      queryClient.clear()
    },
    onError: (error) => {
      console.error("Logout failed:", error)
    },
  })
}
