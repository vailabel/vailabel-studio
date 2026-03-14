import { Label } from "@vailabel/core"
import { request } from "./request"

export const labelsService = {
  getLabelsByProjectId: (projectId: string) =>
    request<Label[]>("GET", `/projects/${projectId}/labels`),
  createLabel: (label: Partial<Label>) =>
    request<Label>("POST", "/labels", label),
  updateLabel: (labelId: string, updates: Partial<Label>) =>
    request<Label>("PUT", `/labels/${labelId}`, updates),
  deleteLabel: (labelId: string) =>
    request<{ success: boolean }>("DELETE", `/labels/${labelId}`),
}
