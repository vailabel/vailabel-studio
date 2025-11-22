/**
 * Project Hooks
 * Project-related React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { Project } from "@vailabel/core"
import { apiClient, queryKeys } from "../api-client-config"

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => apiClient.get<Project[]>("/projects/"),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => apiClient.get<Project>(`/projects/${projectId}`),
    enabled: !!projectId,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (project: Partial<Project>) =>
      apiClient.post<Project>("/projects/", project),
    onSuccess: () => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Project> }) =>
      apiClient.put<Project>(`/projects/${id}`, updates),
    onSuccess: (_, { id }) => {
      // Invalidate specific project and projects list
      queryClient.invalidateQueries({ queryKey: queryKeys.project(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) =>
      apiClient.delete(`/projects/${projectId}`),
    onSuccess: (_, projectId) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({ queryKey: queryKeys.project(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
}
