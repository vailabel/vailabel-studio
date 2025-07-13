import { AIModel } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { AIModelRepository } from "../../db/models"

export class SaveAIModelCommand implements IpcHandler<AIModel, void> {
  channel = "save:aiModels"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    aiModel: AIModel
  ): Promise<void> {
    await AIModelRepository.create({
      ...aiModel,
    })
  }
}
