/**
 * React Query hooks for FastAPI integration
 * Provides easy-to-use hooks for API communication with caching and state management
 * Follows MVVM pattern: React Query hooks as ViewModel, ApiClient as data layer
 */

import { useQuery, useMutation, useQueryClient } from "react-query"
import { ApiClient } from "@/lib/ApiClient"
import {
  User,
  Project,
  Label,
  Annotation,
  ImageData,
  Task,
  AIModel,
  Settings,
  History,
  Permission,
  Role,
} from "@vailabel/core"

// Create a singleton API client instance
const apiClient = new ApiClient({
  baseUrl: "http://localhost:8000/api/v1", // FastAPI backend
  headers: {
    "Content-Type": "application/json",
  },
  getAuthToken: async () => {
    return localStorage.getItem("authToken")
  },
  cache: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
})

// Query keys for consistent caching
export const queryKeys = {
  // Auth
  currentUser: ["auth", "currentUser"] as const,

  // Projects
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,

  // Labels
  labels: (projectId: string) => ["labels", projectId] as const,
  label: (id: string) => ["labels", id] as const,

  // Images
  images: (projectId: string) => ["images", projectId] as const,
  image: (id: string) => ["images", id] as const,
  imageRange: (projectId: string, offset: number, limit: number) =>
    ["images", projectId, "range", offset, limit] as const,

  // Annotations
  annotations: (projectId: string) => ["annotations", projectId] as const,
  annotationsByImage: (imageId: string) =>
    ["annotations", "image", imageId] as const,
  annotation: (id: string) => ["annotations", id] as const,

  // Tasks
  tasks: (projectId?: string) =>
    projectId ? (["tasks", projectId] as const) : (["tasks", "all"] as const),
  task: (id: string) => ["tasks", id] as const,

  // AI Models
  aiModels: (projectId: string) => ["aiModels", projectId] as const,
  aiModel: (id: string) => ["aiModels", id] as const,

  // Settings
  settings: ["settings"] as const,
  setting: (key: string) => ["settings", key] as const,

  // Users
  users: ["users"] as const,
  user: (id: string) => ["users", id] as const,

  // History
  history: (projectId: string) => ["history", projectId] as const,

  // Sync
  syncStatus: ["sync", "status"] as const,

  // Permissions
  permissions: ["permissions"] as const,
  permission: (id: string) => ["permissions", id] as const,
  roles: ["roles"] as const,
  role: (id: string) => ["roles", id] as const,
  userPermissions: (userId: string) =>
    ["users", userId, "permissions"] as const,
}

// Auth hooks
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => apiClient.get<User>("/auth/me"),
    retry: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
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

// Project hooks
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
    mutationFn: (project: Omit<Project, "id">) =>
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

// Label hooks
export function useLabels(projectId: string) {
  return useQuery({
    queryKey: queryKeys.labels(projectId),
    queryFn: () => apiClient.get<Label[]>(`/projects/${projectId}/labels/`),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useCreateLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (label: Omit<Label, "id">) =>
      apiClient.post<Label>("/labels/", label),
    onSuccess: (_, label) => {
      // Invalidate labels for the project
      if (label.project_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.labels(label.project_id),
        })
      }
    },
  })
}

export function useUpdateLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Label> }) =>
      apiClient.put<Label>(`/labels/${id}`, updates),
    onSuccess: (_, { updates }) => {
      // Invalidate labels for the project
      if (updates.project_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.labels(updates.project_id),
        })
      }
    },
  })
}

export function useDeleteLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (labelId: string) => apiClient.delete(`/labels/${labelId}`),
    onSuccess: () => {
      // Invalidate all label queries
      queryClient.invalidateQueries({ queryKey: ["labels"] })
    },
  })
}

// Image hooks
export function useImages(projectId: string) {
  return useQuery({
    queryKey: queryKeys.images(projectId),
    queryFn: () => apiClient.get<ImageData[]>(`/projects/${projectId}/images/`),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useImage(imageId: string) {
  return useQuery({
    queryKey: queryKeys.image(imageId),
    queryFn: () => apiClient.get<ImageData>(`/images/${imageId}`),
    enabled: !!imageId,
  })
}

export function useImageRange(
  projectId: string,
  offset: number,
  limit: number
) {
  return useQuery({
    queryKey: queryKeys.imageRange(projectId, offset, limit),
    queryFn: () =>
      apiClient.get<ImageData[]>(
        `/projects/${projectId}/images/?offset=${offset}&limit=${limit}`
      ),
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export function useCreateImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (image: Omit<ImageData, "id">) =>
      apiClient.post<ImageData>("/images/", image),
    onSuccess: (_, image) => {
      // Invalidate images for the project
      if (image.project_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.images(image.project_id),
        })
      }
    },
  })
}

export function useUpdateImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<ImageData>
    }) => apiClient.put<ImageData>(`/images/${id}`, updates),
    onSuccess: (_, { id, updates }) => {
      // Invalidate specific image and project images
      queryClient.invalidateQueries({ queryKey: queryKeys.image(id) })
      if (updates.project_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.images(updates.project_id),
        })
      }
    },
  })
}

export function useDeleteImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (imageId: string) => apiClient.delete(`/images/${imageId}`),
    onSuccess: () => {
      // Invalidate all image queries
      queryClient.invalidateQueries({ queryKey: ["images"] })
    },
  })
}

// Annotation hooks
export function useAnnotations(projectId: string) {
  return useQuery({
    queryKey: queryKeys.annotations(projectId),
    queryFn: () =>
      apiClient.get<Annotation[]>(`/projects/${projectId}/annotations/`),
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export function useAnnotationsByImage(imageId: string) {
  return useQuery({
    queryKey: queryKeys.annotationsByImage(imageId),
    queryFn: () =>
      apiClient.get<Annotation[]>(`/images/${imageId}/annotations/`),
    enabled: !!imageId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useCreateAnnotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (annotation: Omit<Annotation, "id">) =>
      apiClient.post<Annotation>("/annotations/", annotation),
    onSuccess: (_, annotation) => {
      // Invalidate annotations for the image and project
      if (annotation.image_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.annotationsByImage(annotation.image_id),
        })
      }
    },
  })
}

export function useUpdateAnnotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Annotation>
    }) => apiClient.put<Annotation>(`/annotations/${id}`, updates),
    onSuccess: (_, { id, updates }) => {
      // Invalidate specific annotation and related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.annotation(id) })
      if (updates.image_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.annotationsByImage(updates.image_id),
        })
      }
    },
  })
}

export function useDeleteAnnotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (annotationId: string) =>
      apiClient.delete(`/annotations/${annotationId}`),
    onSuccess: () => {
      // Invalidate all annotation queries
      queryClient.invalidateQueries({ queryKey: ["annotations"] })
    },
  })
}

// Task hooks
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

// AI Model hooks
export function useAIModels(projectId: string) {
  return useQuery({
    queryKey: queryKeys.aiModels(projectId),
    queryFn: () =>
      apiClient.get<AIModel[]>(`/projects/${projectId}/ai-models/`),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreateAIModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (aiModel: Omit<AIModel, "id">) =>
      apiClient.post<AIModel>("/ai-models/", aiModel),
    onSuccess: () => {
      // Invalidate all AI model queries
      queryClient.invalidateQueries({ queryKey: ["aiModels"] })
    },
  })
}

export function useUpdateAIModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AIModel> }) =>
      apiClient.put<AIModel>(`/ai-models/${id}`, updates),
    onSuccess: (_, { id }) => {
      // Invalidate specific AI model and related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.aiModel(id) })
      queryClient.invalidateQueries({ queryKey: ["aiModels"] })
    },
  })
}

export function useDeleteAIModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (aiModelId: string) =>
      apiClient.delete(`/ai-models/${aiModelId}`),
    onSuccess: () => {
      // Invalidate all AI model queries
      queryClient.invalidateQueries({ queryKey: ["aiModels"] })
    },
  })
}

// Settings hooks
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

// History hooks
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

// Sync hooks
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

// Permission hooks
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

// Role hooks
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

// User permission hooks
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

// User management hooks
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

// Utility hooks
export function useServerStatus() {
  return useQuery({
    queryKey: ["server", "status"],
    queryFn: () => apiClient.healthCheck(),
    refetchInterval: 30 * 1000, // Check every 30 seconds
    staleTime: 10 * 1000, // 10 seconds
  })
}
