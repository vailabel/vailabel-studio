import { AIModel } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { AIModelRepository } from "../../db/models"

export class FetchAIModelQuery implements IpcHandler<void, AIModel[]> {
  channel = "fetch:aiModels"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    _req?: void
  ): Promise<AIModel[]> {
    const aiModelList = await AIModelRepository.findAll()
    return aiModelList.map((aiModel) => {
      return {
        id: aiModel.id,
        name: aiModel.name,
        createdAt: aiModel.createdAt,
        updatedAt: aiModel.updatedAt,
        description: aiModel.description,
        version: aiModel.version,
        modelPath: aiModel.modelPath,
        configPath: aiModel.configPath,
        modelSize: aiModel.modelSize,
        isCustom: aiModel.isCustom,
        // Add any other required properties of AIModel here if needed
      }
    })
  }
}
