import { AIModel } from "@vailabel/core"

export interface IAIModelService {
  getAIModelsByProjectId(projectId: string): Promise<AIModel[]>
  createAIModel(aiModel: AIModel): Promise<void>
  updateAIModel(aiModelId: string, updates: Partial<AIModel>): Promise<void>
  deleteAIModel(aiModelId: string): Promise<void>
}
