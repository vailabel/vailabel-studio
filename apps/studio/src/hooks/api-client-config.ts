/**
 * Shared API Client Configuration
 * Provides singleton API client instance and query keys for React Query
 */

import { ApiClient } from "@/lib/ApiClient"

// Create a singleton API client instance
export const apiClient = new ApiClient({
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
