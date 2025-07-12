import { Task } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { TaskRepository } from "../../db/models"

export class SaveTaskCommand implements IpcHandler<Task, void> {
  channel = "save:tasks"

  async handle(_event: Electron.IpcMainInvokeEvent, task: Task): Promise<void> {
    await TaskRepository.create({
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      projectId: task.projectId,
    })
  }
}
