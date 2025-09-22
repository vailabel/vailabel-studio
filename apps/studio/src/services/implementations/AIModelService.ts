import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { IAIModelService } from "../contracts/IAIModelService"
import { AIModel } from "@vailabel/core"

export class AIModelService implements IAIModelService {
  private dataAdapter: IDataAdapter

  constructor(dataAdapter: IDataAdapter) {
    this.dataAdapter = dataAdapter
  }

  async getAIModelsByProjectId(projectId: string): Promise<AIModel[]> {
    return await this.dataAdapter.fetchAIModels(projectId)
  }

  async createAIModel(aiModel: AIModel): Promise<void> {
    await this.dataAdapter.saveAIModel(aiModel)
  }

  async updateAIModel(aiModelId: string, updates: Partial<AIModel>): Promise<void> {
    await this.dataAdapter.updateAIModel(aiModelId, updates)
  }

  async deleteAIModel(aiModelId: string): Promise<void> {
    await this.dataAdapter.deleteAIModel(aiModelId)
  }
}
