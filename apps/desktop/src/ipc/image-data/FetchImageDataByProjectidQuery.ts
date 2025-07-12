import { ImageData } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { ImageDataRepository } from "../../db/models"

export class FetchImageDataByProjectidQuery implements IpcHandler<string, ImageData[]> {
  channel = "fetch:imageDataByProjectId"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    projectId: string
  ): Promise<ImageData[]> {
    const imageDataList = await ImageDataRepository.findAll({
      where: { projectId }
    })
    return imageDataList.map((imageData) => {
      return {
        id: imageData.id,
        url: imageData.url,
        createdAt: imageData.createdAt,
        updatedAt: imageData.updatedAt,
        projectId: imageData.projectId,
        name: imageData.name,
        data: imageData.data,
        width: imageData.width,
        height: imageData.height,
      }
    })
  }
}
