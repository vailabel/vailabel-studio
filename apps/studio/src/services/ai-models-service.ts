import { AIModel } from "@vailabel/core"
import { request } from "./request"
import {
  downloadSystemModel as invokeDownloadSystemModel,
  type DownloadSystemModelPayload,
} from "@/lib/desktop"

export const aiModelsService = {
  list: () => request<AIModel[]>("GET", "/ai-models"),
  listByProjectId: (projectId: string) =>
    request<AIModel[]>("GET", `/projects/${projectId}/ai-models`),
  create: (model: Partial<AIModel>) =>
    request<AIModel>("POST", "/ai-models", model),
  update: (modelId: string, updates: Partial<AIModel>) =>
    request<AIModel>("PUT", `/ai-models/${modelId}`, updates),
  delete: (modelId: string) =>
    request<{ success: boolean }>("DELETE", `/ai-models/${modelId}`),
  downloadSystemModel: (payload: DownloadSystemModelPayload) =>
    invokeDownloadSystemModel(payload) as Promise<AIModel>,
}
