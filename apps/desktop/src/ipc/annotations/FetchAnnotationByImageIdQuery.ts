import { Annotation } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { AnnotationRepository } from "../../db/models"

export class FetchAnnotationByImageIdQuery implements IpcHandler<string, Annotation[]> {
  channel = "fetch:getAnnotationsByImageId"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    imageId: string
  ): Promise<Annotation[]> {
    const annotations = await AnnotationRepository.findAll({
      where: { imageId }
    })
    return annotations.map((annotation) => {
      return {
        id: annotation.id,
        labelId: annotation.labelId,
        name: annotation.name,
        type: annotation.type,
        coordinates: annotation.coordinates,
        createdAt: annotation.createdAt,
        updatedAt: annotation.updatedAt,
        imageId: annotation.imageId,
        color: annotation.color,
        isAIGenerated: annotation.isAIGenerated
      } as Annotation
    })
  }
}