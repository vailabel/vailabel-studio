import { Annotation } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { AnnotationRepository } from "../../db/models"

export class UpdateAnnotationCommand implements IpcHandler<Annotation, void> {
  channel = "update:annotations"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    annotation: Annotation
  ): Promise<void> {
    await AnnotationRepository.update(annotation, {
      where: { id: annotation.id },
    })
  }
}
