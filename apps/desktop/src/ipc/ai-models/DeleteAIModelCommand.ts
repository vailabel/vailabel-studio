import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { AIModelRepository } from "../../db/models"

export class DeleteAIModelCommand implements IpcHandler<string, void> {
  channel = "delete:aiModels"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    aiModelId: string
  ): Promise<void> {
    await AIModelRepository.destroy({ where: { id: aiModelId } })
  }
}
