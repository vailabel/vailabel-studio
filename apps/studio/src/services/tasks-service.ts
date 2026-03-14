import { Task } from "@vailabel/core"
import { request } from "./request"

export const tasksService = {
  list: () => request<Task[]>("GET", "/tasks"),
  listByProjectId: (projectId: string) =>
    projectId
      ? request<Task[]>("GET", `/tasks/project/${projectId}`)
      : request<Task[]>("GET", "/tasks"),
  getById: (taskId: string) => request<Task>("GET", `/tasks/${taskId}`),
  create: (task: Partial<Task>) => request<Task>("POST", "/tasks", task),
  update: (taskId: string, updates: Partial<Task>) =>
    request<Task>("PUT", `/tasks/${taskId}`, updates),
  delete: (taskId: string) =>
    request<{ success: boolean }>("DELETE", `/tasks/${taskId}`),
}
