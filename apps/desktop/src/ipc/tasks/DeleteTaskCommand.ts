import { Task } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { TaskRepository } from "../../db/models"

export class DeleteTaskCommand implements IpcHandler<Task, void> {
  channel = "delete:tasks"

  async handle(_event: Electron.IpcMainInvokeEvent, task: Task): Promise<void> {
    await TaskRepository.destroy({ where: { id: task.id } })
  }
}
