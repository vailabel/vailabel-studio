import { Task } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { TaskRepository } from "../../db/models"

export class UpdateTaskCommand implements IpcHandler<Task, void> {
  channel = "update:tasks"

  async handle(_event: Electron.IpcMainInvokeEvent, task: Task): Promise<void> {
    await TaskRepository.update(task, { where: { id: task.id } })
  }
}
