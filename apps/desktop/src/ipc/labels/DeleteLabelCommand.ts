import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { LabelRepository } from "../../db/models"

export class DeleteLabelCommand implements IpcHandler<string, void> {
  channel = "delete:labels"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    labelId: string
  ): Promise<void> {
    await LabelRepository.destroy({ where: { id: labelId } })
  }
}
