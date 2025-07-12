import { ImageData } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { ImageDataRepository } from "../../db/models"

export class UpdateImageDataCommand implements IpcHandler<ImageData, void> {
  channel = "update:imageData"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    imageData: ImageData
  ): Promise<void> {
    await ImageDataRepository.update(imageData, { where: { id: imageData.id } })
  }
}
