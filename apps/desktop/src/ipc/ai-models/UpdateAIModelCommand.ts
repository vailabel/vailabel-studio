import { AIModel } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { AIModelRepository } from "../../db/models"

export class UpdateAIModelCommand implements IpcHandler<AIModel, void> {
  channel = "update:aiModels"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    aiModel: AIModel
  ): Promise<void> {
    await AIModelRepository.update(aiModel, { where: { id: aiModel.id } })
  }
}
