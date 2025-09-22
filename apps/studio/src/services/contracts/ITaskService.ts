import { Task } from "@vailabel/core"

export interface ITaskService {
  getTasksByProjectId(projectId: string): Promise<Task[]>
  getAllTasks(): Promise<Task[]>
  createTask(task: Task): Promise<void>
  updateTask(taskId: string, updates: Partial<Task>): Promise<void>
  deleteTask(taskId: string): Promise<void>
}
