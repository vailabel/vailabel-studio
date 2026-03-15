import { History } from "@/types/core"
import { studioCommands } from "@/ipc/studio"

export const historyService = {
  listByProjectId: (projectId: string) =>
    studioCommands.historyListByProject(projectId),
  create: (history: Partial<History>) => studioCommands.historySave(history),
}

