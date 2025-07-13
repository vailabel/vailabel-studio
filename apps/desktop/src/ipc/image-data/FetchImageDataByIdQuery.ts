import { ImageData } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { AnnotationRepository, ImageDataRepository } from "../../db/models"

export class FetchImageDataByIdQuery
  implements IpcHandler<string, ImageData | undefined>
{
  channel = "fetch:imageDataById"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    imageId: string
  ): Promise<ImageData | undefined> {
    const imageData = await ImageDataRepository.findOne({
      where: { id: imageId },
      include: [{ model: AnnotationRepository, as: "annotations" }],
    })
    return imageData
      ? {
          id: imageData.id,
          url: imageData.url,
          createdAt: imageData.createdAt,
          updatedAt: imageData.updatedAt,
          projectId: imageData.projectId,
          annotations: imageData.annotations.map((annotation) => ({
            id: annotation.id,
            labelId: annotation.labelId,
            color: annotation.color,
            imageId: annotation.imageId,
            name: annotation.name,
            type: annotation.type,
            coordinates: annotation.coordinates,
            createdAt: annotation.createdAt,
            updatedAt: annotation.updatedAt,
          })),
          name: imageData.name,
          data: imageData.data,
          width: imageData.width,
          height: imageData.height,
        }
      : undefined
  }
}
