import { Label } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { LabelRepository } from "../../db/models"

export class FetchLabelQuery implements IpcHandler<void, Label[]> {
  channel = "fetch:labels"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    _req?: void
  ): Promise<Label[]> {
    const label = await LabelRepository.findAll()
    return label.map((label) => {
      return {
        id: label.id,
        name: label.name,
        category: label.category,
        isAIGenerated: label.isAIGenerated,
        createdAt: label.createdAt,
        updatedAt: label.updatedAt,
        projectId: label.projectId,
        color: label.color,
      }
    })
  }
}
