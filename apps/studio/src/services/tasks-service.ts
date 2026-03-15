import { Task } from "@/types/core"
import { studioCommands } from "@/ipc/studio"

export const tasksService = {
  list: () => studioCommands.tasksList(),
  listByProjectId: (projectId: string) =>
    projectId
      ? studioCommands.tasksListByProject(projectId)
      : studioCommands.tasksList(),
  getById: (taskId: string) => studioCommands.tasksGet(taskId),
  create: (task: Partial<Task>) => studioCommands.tasksSave(task),
  update: (taskId: string, updates: Partial<Task>) =>
    studioCommands.tasksSave({ id: taskId, ...updates }),
  delete: (taskId: string) => studioCommands.tasksDelete(taskId),
}

