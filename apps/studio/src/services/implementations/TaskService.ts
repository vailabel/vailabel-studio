import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { ITaskService } from "../contracts/ITaskService"
import { Task } from "@vailabel/core"

export class TaskService implements ITaskService {
  private dataAdapter: IDataAdapter

  constructor(dataAdapter: IDataAdapter) {
    this.dataAdapter = dataAdapter
  }

  async getTasksByProjectId(projectId: string): Promise<Task[]> {
    return await this.dataAdapter.fetchTasks(projectId)
  }

  async getAllTasks(): Promise<Task[]> {
    return await this.dataAdapter.fetchTasks("")
  }

  async createTask(task: Task): Promise<void> {
    await this.dataAdapter.saveTask(task)
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    await this.dataAdapter.updateTask(taskId, updates)
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.dataAdapter.deleteTask(taskId)
  }
}
