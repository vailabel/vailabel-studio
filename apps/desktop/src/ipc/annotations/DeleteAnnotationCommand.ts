import { Annotation } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { AnnotationRepository } from "../../db/models"

export class DeleteAnnotationCommand implements IpcHandler<string, void> {
  channel = "delete:annotations"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    annotationId: string
  ): Promise<void> {
    await AnnotationRepository.destroy({ where: { id: annotationId } })
  }
}
