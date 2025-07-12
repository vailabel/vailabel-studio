import { Label } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { LabelRepository } from "../../db/models"

export class DeleteLabelCommand implements IpcHandler<Label, void> {
  channel = "delete:labels"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    label: Label
  ): Promise<void> {
    await LabelRepository.destroy({ where: { id: label.id } })
  }
}