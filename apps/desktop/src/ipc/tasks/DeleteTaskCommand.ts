import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { TaskRepository } from "../../db/models"

export class DeleteTaskCommand implements IpcHandler<string, void> {
  channel = "delete:tasks"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    taskId: string
  ): Promise<void> {
    await TaskRepository.destroy({ where: { id: taskId } })
  }
}
