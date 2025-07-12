import { History } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { HistoryRepository } from "../../db/models"

export class SaveHistoryCommand implements IpcHandler<History, void> {
  channel = "save:history"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    history: History
  ): Promise<void> {
    await HistoryRepository.create({
      id: history.id,
      historyIndex: history.historyIndex,
      canUndo: history.canUndo,
      canRedo: history.canRedo,
    })
  }
}
