/**
 * Task Hooks
 * Task-related React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { Task } from "@vailabel/core"
import { apiClient, queryKeys } from "../api-client-config"

export function useTasks(projectId?: string) {
  return useQuery({
    queryKey: projectId ? queryKeys.tasks(projectId) : ["tasks", "all"],
    queryFn: () =>
      projectId
        ? apiClient.get<Task[]>(`/tasks/project/${projectId}`)
        : apiClient.get<Task[]>("/tasks/"),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: queryKeys.task(taskId),
    queryFn: () => apiClient.get<Task>(`/tasks/${taskId}`),
    enabled: !!taskId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (task: Omit<Task, "id">) =>
      apiClient.post<Task>("/tasks/", task),
    onSuccess: (_, task) => {
      // Invalidate tasks for the project
      if (task.project_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks(task.project_id),
        })
      }
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      apiClient.put<Task>(`/tasks/${id}`, updates),
    onSuccess: (_, { id, updates }) => {
      // Invalidate specific task and project tasks
      queryClient.invalidateQueries({ queryKey: queryKeys.task(id) })
      if (updates.project_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks(updates.project_id),
        })
      }
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => apiClient.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      // Invalidate all task queries
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}
