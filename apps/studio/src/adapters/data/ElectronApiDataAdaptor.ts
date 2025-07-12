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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  private api: Window["ipc"]
  constructor() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    this.api = window.ipc
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
  fetchLabels(projectId: string): Promise<Label[]> {
    return this.api.invoke(`fetch:labels`, projectId)
  }
  saveLabel(label: Label): Promise<void> {
    return this.api.invoke(`save:labels`, label)
  }
  deleteLabel(labelId: string): Promise<void> {
    return this.api.invoke(`delete:labels`, labelId)
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
  fetchImageData(projectId: string): Promise<ImageData[]> {
    return this.api.invoke(`fetch:imageData`, projectId)
  }
  saveImageData(imageData: ImageData): Promise<void> {
    return this.api.invoke(`save:imageData`, imageData)
  }
  deleteImageData(imageId: string): Promise<void> {
    return this.api.invoke(`delete:imageData`, imageId)
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
  fetchTasks(projectId: string): Promise<Task[]> {
    return this.api.invoke(`fetch:tasks`, projectId)
  }
  saveTask(task: Task): Promise<void> {
    return this.api.invoke(`save:tasks`, task)
  }
  deleteTask(taskId: string): Promise<void> {
    return this.api.invoke(`delete:tasks`, taskId)
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
  fetchSettings(projectId: string): Promise<Settings> {
    return this.api.invoke(`fetch:settings`, projectId)
  }
  saveSettings(settings: Settings): Promise<void> {
    return this.api.invoke(`save:settings`, settings)
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
  login(username: string, password: string): Promise<User> {
    return this.api.invoke(`login:users`, { username, password })
  }
  logout(): Promise<void> {
    return this.api.invoke(`logout:users`)
  }
  syncData(): Promise<void> {
    return this.api.invoke(`sync:users`)
  }
}
