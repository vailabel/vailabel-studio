import { ImageData } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { ImageDataRepository } from "../../db/models"

export class DeleteImageDataCommand implements IpcHandler<ImageData, void> {
  channel = "delete:imageData"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    imageData: ImageData
  ): Promise<void> {
    await ImageDataRepository.destroy({ where: { id: imageData.id } })
  }
}
