import { Label } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { LabelRepository } from "../../db/models"

export class FetchLabelQuery implements IpcHandler<string, Label[]> {
  channel = "fetch:labels"
  /**
   * Fetches all labels from the database.
   * @param _event - The IPC event (not used in this handler).
   * @returns A promise that resolves to an array of Label objects.
   */
  async handle(
    _event: Electron.IpcMainInvokeEvent,
    projectId: string
  ): Promise<Label[]> {
    const labels = await LabelRepository.findAll({ where: { projectId } })
    return labels.map((label) => {
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
