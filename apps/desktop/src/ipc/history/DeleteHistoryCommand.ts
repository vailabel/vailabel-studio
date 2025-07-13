import { History } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { HistoryRepository } from "../../db/models"

export class DeleteHistoryCommand implements IpcHandler<History, void> {
  channel = "delete:history"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    history: History
  ): Promise<void> {
    await HistoryRepository.destroy({ where: { id: history.id } })
  }
}
