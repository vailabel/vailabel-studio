import { Task } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { TaskRepository } from "../../db/models"

export class FetchTaskQuery implements IpcHandler<void, Task[]> {
  channel = "fetch:tasks"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    _req?: void
  ): Promise<Task[]> {
    const taskList = await TaskRepository.findAll()
    return taskList.map((task) => {
      return {
        id: task.id,
        name: task.name,
        description: task.description,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        projectId: task.projectId,
      }
    })
  }
}
