import { Annotation } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { AnnotationRepository } from "../../db/models"

export class DeleteAnnotationCommand implements IpcHandler<Annotation, void> {
  channel = "delete:annotations"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    annotation: Annotation
  ): Promise<void> {
    await AnnotationRepository.destroy({ where: { id: annotation.id } })
  }
}
