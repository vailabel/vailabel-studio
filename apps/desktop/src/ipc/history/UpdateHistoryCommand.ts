import { History } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { HistoryRepository } from "../../db/models"

export class UpdateHistoryCommand implements IpcHandler<History, void> {
  channel = "update:history"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    history: History
  ): Promise<void> {
    await HistoryRepository.update(history, { where: { id: history.id } })
  }
}
