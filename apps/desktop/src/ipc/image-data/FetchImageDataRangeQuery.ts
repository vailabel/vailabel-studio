import { ImageData } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { ImageDataRepository } from "../../db/models"

export class FetchImageDataRangeQuery
  implements
    IpcHandler<
      { projectId: string; offset: number; limit: number },
      ImageData[]
    >
{
  channel = "fetch:imageDataRange"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    args: { projectId: string; offset: number; limit: number }
  ): Promise<ImageData[]> {
    const { projectId, offset, limit } = args
    const imageDataList = await ImageDataRepository.findAll({
      where: { projectId },
      order: [["createdAt", "ASC"]],
      offset,
      limit,
    })
    return imageDataList.map((imageData) => ({
      id: imageData.id,
      url: imageData.url,
      createdAt: imageData.createdAt,
      updatedAt: imageData.updatedAt,
      projectId: imageData.projectId,
      name: imageData.name,
      data: imageData.data,
      width: imageData.width,
      height: imageData.height,
    }))
  }
}
