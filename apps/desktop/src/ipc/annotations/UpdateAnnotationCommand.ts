import { Annotation } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { AnnotationRepository } from "../../db/models"

export interface UpdateAnnotationRequest {
  id: string
  updates: Partial<Annotation>
}

export class UpdateAnnotationCommand implements IpcHandler<UpdateAnnotationRequest, void> {
  channel = "update:annotations"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    { id, updates }: UpdateAnnotationRequest
  ): Promise<void> {
    await AnnotationRepository.update(updates, {
      where: { id: id },
    })
  }
}
