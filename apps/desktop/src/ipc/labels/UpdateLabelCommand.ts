import { Label } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { LabelRepository } from "../../db/models"

export class UpdateLabelCommand implements IpcHandler<Label, void> {
  channel = "update:labels"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    label: Label
  ): Promise<void> {
    await LabelRepository.update(label, { where: { id: label.id } })
  }
}
