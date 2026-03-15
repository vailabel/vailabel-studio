import { AIModel } from "@/types/core"
import type { ModelImportPayload } from "@/types/core"
import { studioCommands } from "@/ipc/studio"

export const aiModelsService = {
  list: () => studioCommands.aiModelsList(),
  listByProjectId: (projectId: string) =>
    studioCommands.aiModelsListByProject(projectId),
  create: (model: Partial<AIModel>) =>
    studioCommands.aiModelsSave(model),
  update: (modelId: string, updates: Partial<AIModel>) =>
    studioCommands.aiModelsSave({ id: modelId, ...updates }),
  delete: (modelId: string) => studioCommands.aiModelsDelete(modelId),
  setActive: (modelId: string) => studioCommands.aiModelsSetActive(modelId),
  importModel: (payload: ModelImportPayload) =>
    studioCommands.aiModelsImport(payload),
}

