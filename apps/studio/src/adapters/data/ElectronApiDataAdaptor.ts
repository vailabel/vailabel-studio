import {
  Project,
  Label,
  Annotation,
  ImageData,
  History,
  Task,
  AIModel,
  Settings,
  User,
} from "@vailabel/core"
import { IDataAdapter } from "./IDataAdapter"

export class ElectronApiDataAdapter implements IDataAdapter {
  private api: Window["ipc"]
  constructor() {
    this.api = window.ipc
  }

  // Project-related methods
  updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    return this.api.invoke(`update:projects`, projectId, updates)
  }
  fetchProjects(): Promise<Project[]> {
    return this.api.invoke(`fetch:projects`)
  }
  saveProject(project: Project): Promise<void> {
    return this.api.invoke(`save:projects`, project)
  }
  deleteProject(projectId: string): Promise<void> {
    return this.api.invoke(`delete:projects`, projectId)
  }

  // Label-related methods
  updateLabel(labelId: string, updates: Partial<Label>): Promise<void> {
    return this.api.invoke(`update:labels`, labelId, updates)
  }
  fetchLabels(projectId: string): Promise<Label[]> {
    return this.api.invoke(`fetch:labels`, projectId)
  }
  saveLabel(label: Label): Promise<void> {
    return this.api.invoke(`save:labels`, label)
  }
  deleteLabel(labelId: string): Promise<void> {
    return this.api.invoke(`delete:labels`, labelId)
  }

  // Annotation-related methods
  updateAnnotation(
    annotationId: string,
    updates: Partial<Annotation>
  ): Promise<void> {
    return this.api.invoke(`update:annotations`, annotationId, updates)
  }
  fetchAnnotations(projectId: string): Promise<Annotation[]> {
    return this.api.invoke(`fetch:annotations`, projectId)
  }
  saveAnnotation(annotation: Annotation): Promise<void> {
    return this.api.invoke(`save:annotations`, annotation)
  }
  deleteAnnotation(annotationId: string): Promise<void> {
    return this.api.invoke(`delete:annotations`, annotationId)
  }

  // ImageData-related methods
  updateImageData(imageId: string, updates: Partial<ImageData>): Promise<void> {
    return this.api.invoke(`update:imageData`, imageId, updates)
  }
  fetchImageData(projectId: string): Promise<ImageData[]> {
    return this.api.invoke(`fetch:imageData`, projectId)
  }
  saveImageData(imageData: ImageData): Promise<void> {
    return this.api.invoke(`save:imageData`, imageData)
  }
  deleteImageData(imageId: string): Promise<void> {
    return this.api.invoke(`delete:imageData`, imageId)
  }

  // History-related methods
  updateHistory(historyId: string, updates: Partial<History>): Promise<void> {
    return this.api.invoke(`update:history`, historyId, updates)
  }
  fetchHistory(projectId: string): Promise<History[]> {
    return this.api.invoke(`fetch:history`, projectId)
  }
  saveHistory(history: History): Promise<void> {
    return this.api.invoke(`save:history`, history)
  }
  deleteHistory(historyId: string): Promise<void> {
    return this.api.invoke(`delete:history`, historyId)
  }

  // Task-related methods
  updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    return this.api.invoke(`update:tasks`, taskId, updates)
  }
  fetchTasks(projectId: string): Promise<Task[]> {
    return this.api.invoke(`fetch:tasks`, projectId)
  }
  saveTask(task: Task): Promise<void> {
    return this.api.invoke(`save:tasks`, task)
  }
  deleteTask(taskId: string): Promise<void> {
    return this.api.invoke(`delete:tasks`, taskId)
  }

  // AIModel-related methods
  updateAIModel(aiModelId: string, updates: Partial<AIModel>): Promise<void> {
    return this.api.invoke(`update:aiModels`, aiModelId, updates)
  }
  fetchAIModels(projectId: string): Promise<AIModel[]> {
    return this.api.invoke(`fetch:aiModels`, projectId)
  }
  saveAIModel(aiModel: AIModel): Promise<void> {
    return this.api.invoke(`save:aiModels`, aiModel)
  }
  deleteAIModel(aiModelId: string): Promise<void> {
    return this.api.invoke(`delete:aiModels`, aiModelId)
  }

  // Settings-related methods
  fetchSettings(projectId: string): Promise<Settings> {
    return this.api.invoke(`fetch:settings`, projectId)
  }
  saveSettings(settings: Settings): Promise<void> {
    return this.api.invoke(`save:settings`, settings)
  }

  // User-related methods
  updateUser(userId: string, updates: Partial<User>): Promise<void> {
    return this.api.invoke(`update:users`, userId, updates)
  }
  fetchUsers(): Promise<User[]> {
    return this.api.invoke(`fetch:users`)
  }
  saveUser(user: User): Promise<void> {
    return this.api.invoke(`save:users`, user)
  }
  deleteUser(userId: string): Promise<void> {
    return this.api.invoke(`delete:users`, userId)
  }

  // Authentication methods
  login(username: string, password: string): Promise<User> {
    return this.api.invoke(`login:users`, { username, password })
  }
  logout(): Promise<void> {
    return this.api.invoke(`logout:users`)
  }

  // Sync methods
  syncData(): Promise<void> {
    return this.api.invoke(`sync:users`)
  }
}
