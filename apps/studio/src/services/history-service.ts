import { History } from "@vailabel/core"
import { request } from "./request"

export const historyService = {
  listByProjectId: (projectId: string) =>
    request<History[]>("GET", `/projects/${projectId}/history`),
  create: (history: Partial<History>) =>
    request<History>("POST", "/history", history),
}
