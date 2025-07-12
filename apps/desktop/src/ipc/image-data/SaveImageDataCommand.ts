import { ImageData } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { ImageDataRepository } from "../../db/models"

export class SaveImageDataCommand implements IpcHandler<ImageData, void> {
  channel = "save:imageData"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    imageData: ImageData
  ): Promise<void> {
    await ImageDataRepository.create({
      id: imageData.id,
      url: imageData.url,
      createdAt: imageData.createdAt,
      updatedAt: imageData.updatedAt,
      projectId: imageData.projectId,
      name: imageData.name,
      data: imageData.data,
      width: imageData.width,
      height: imageData.height,
    })
  }
}
