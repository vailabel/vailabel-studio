import { Annotation } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { AnnotationRepository } from "../../db/models"

export class SaveAnnotationCommand implements IpcHandler<Annotation, void> {
  channel = "save:annotations"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    annotation: Annotation
  ): Promise<void> {
    await AnnotationRepository.create({
      ...annotation,
    })
  }
}
