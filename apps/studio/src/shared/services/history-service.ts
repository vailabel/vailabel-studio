import { History } from "@/shared/types/core"
import { studioCommands } from "@/shared/ipc/studio"

export const historyService = {
  listByProjectId: (projectId: string) =>
    studioCommands.historyListByProject(projectId),
  create: (history: Partial<History>) => studioCommands.historySave(history),
}

