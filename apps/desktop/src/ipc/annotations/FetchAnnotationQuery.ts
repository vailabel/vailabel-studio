import { Annotation } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { AnnotationRepository } from "../../db/models"

export class FetchAnnotationQuery implements IpcHandler<void, Annotation[]> {
  channel = "fetch:annotations"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    _req?: void
  ): Promise<Annotation[]> {
    const annotations = await AnnotationRepository.findAll()
    return annotations.map((annotation) => {
      return {
        id: annotation.id,
        labelId: annotation.labelId,
        imageId: annotation.imageId,
        coordinates: annotation.coordinates.map((coord) => ({
          x: coord.x,
          y: coord.y,
        })),
        createdAt: annotation.createdAt,
        updatedAt: annotation.updatedAt,
        name: annotation.name,
        type: annotation.type,
      }
    })
  }
}
