import { AIModel } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { AIModelRepository } from "../../db/models"

export class DeleteAIModelCommand implements IpcHandler<AIModel, void> {
  channel = "delete:aiModels"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    aiModel: AIModel
  ): Promise<void> {
    await AIModelRepository.destroy({ where: { id: aiModel.id } })
  }
}
