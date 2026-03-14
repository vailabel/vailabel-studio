import { Project } from "@vailabel/core"
import { request } from "./request"

export const projectsService = {
  list: () => request<Project[]>("GET", "/projects"),
  getById: (projectId: string) =>
    request<Project>("GET", `/projects/${projectId}`),
  create: (project: Partial<Project>) =>
    request<Project>("POST", "/projects", project),
  update: (projectId: string, updates: Partial<Project>) =>
    request<Project>("PUT", `/projects/${projectId}`, updates),
  delete: (projectId: string) =>
    request<{ success: boolean }>("DELETE", `/projects/${projectId}`),
}
