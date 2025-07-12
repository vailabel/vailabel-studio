import { Label } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { LabelRepository } from "../../db/models"


export class SaveLabelCommand implements IpcHandler<Label, void> {
  channel = "save:labels"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    label: Label
  ): Promise<void> {
    await LabelRepository.create({
      id: label.id,
      name: label.name,
      category: label.category,
      isAIGenerated: label.isAIGenerated,
      createdAt: label.createdAt,
      updatedAt: label.updatedAt,
      projectId: label.projectId,
      color: label.color,
    })
  }
}