import { History } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { HistoryRepository } from "../../db/models"

export class FetchHistoryQuery implements IpcHandler<void, History[]> {
  channel = "fetch:history"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    _req?: void
  ): Promise<History[]> {
    const historyList = await HistoryRepository.findAll()
    return historyList.map((history) => {
      return {
        id: history.id,
        historyIndex: history.historyIndex,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
      }
    })
  }
}
