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
import { ApiClient } from "@/lib/ApiClient"

export class CloudApiDataAdapter implements IDataAdapter {
  private api: ApiClient // Replace with actual API type if available
  constructor() {
    this.api = new ApiClient({
      baseUrl: "http://127.0.0.1:8000/api/v1", // Replace with actual base URL
      headers: {
        "Content-Type": "application/json",
      },
      getAuthToken: async () => {
        // Implement your token retrieval logic here
        return localStorage.getItem("authToken")
      },
      cache: true,
      cacheDuration: 5 * 60 * 1000, // 5 minutes
    }) // Initialize the API client here
  }
  fetchImageDataRange(projectId: string, offset: number, limit: number): Promise<ImageData[]> {
    return this.api.get<ImageData[]>(`/projects/${projectId}/images?offset=${offset}&limit=${limit}`)
  }
  getAnnotationsByImageId(imageId: string): Promise<Annotation[]> {
    return this.api.get<Annotation[]>(`/images/${imageId}/annotations`)
  }
  fetchImageDataById(imageId: string): Promise<ImageData | undefined> {
    return this.api.get<ImageData | undefined>(`/images/${imageId}`)
  }
  fetchImageDataByProjectId(projectId: string): Promise<ImageData[]> {
    return this.api.get(`/projects/${projectId}/images`)
  }

  updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    return this.api.put(`/projects/${projectId}`, updates)
  }
  updateLabel(labelId: string, updates: Partial<Label>): Promise<void> {
    return this.api.put(`/labels/${labelId}`, updates)
  }
  updateAnnotation(
    annotationId: string,
    updates: Partial<Annotation>
  ): Promise<void> {
    return this.api.put(`/annotations/${annotationId}`, updates)
  }
  updateImageData(imageId: string, updates: Partial<ImageData>): Promise<void> {
    return this.api.put(`/images/${imageId}`, updates)
  }
  updateHistory(historyId: string, updates: Partial<History>): Promise<void> {
    return this.api.put(`/history/${historyId}`, updates)
  }
  updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    return this.api.put(`/tasks/${taskId}`, updates)
  }
  updateAIModel(aiModelId: string, updates: Partial<AIModel>): Promise<void> {
    return this.api.put(`/ai-models/${aiModelId}`, updates)
  }
  updateUser(userId: string, updates: Partial<User>): Promise<void> {
    return this.api.put(`/users/${userId}`, updates)
  }
  fetchProjects(): Promise<Project[]> {
    return this.api.get<Project[]>(`/projects`)
  }
  saveProject(project: Project): Promise<void> {
    return this.api.post(`/projects`, project)
  }
  deleteProject(projectId: string): Promise<void> {
    return this.api.delete(`/projects/${projectId}`)
  }
  fetchLabels(projectId: string): Promise<Label[]> {
    return this.api.get<Label[]>(`/projects/${projectId}/labels`)
  }
  saveLabel(label: Label): Promise<void> {
    return this.api.post(`/labels`, label)
  }
  deleteLabel(labelId: string): Promise<void> {
    return this.api.delete(`/labels/${labelId}`)
  }
  fetchAnnotations(projectId: string): Promise<Annotation[]> {
    return this.api.get<Annotation[]>(`/projects/${projectId}/annotations`)
  }
  saveAnnotation(annotation: Annotation): Promise<void> {
    return this.api.post(`/annotations`, annotation)
  }
  deleteAnnotation(annotationId: string): Promise<void> {
    return this.api.delete(`/annotations/${annotationId}`)
  }
  fetchImageData(projectId: string): Promise<ImageData[]> {
    return this.api.get<ImageData[]>(`/projects/${projectId}/images`)
  }
  saveImageData(imageData: ImageData): Promise<void> {
    return this.api.post(`/images`, imageData)
  }
  deleteImageData(imageId: string): Promise<void> {
    return this.api.delete(`/images/${imageId}`)
  }
  fetchHistory(projectId: string): Promise<History[]> {
    return this.api.get<History[]>(`/projects/${projectId}/history`)
  }
  saveHistory(history: History): Promise<void> {
    return this.api.post(`/history`, history)
  }
  deleteHistory(historyId: string): Promise<void> {
    return this.api.delete(`/history/${historyId}`)
  }
  fetchTasks(projectId: string): Promise<Task[]> {
    if (projectId) {
      return this.api.get<Task[]>(`/tasks/project/${projectId}`)
    }
    return this.api.get<Task[]>(`/tasks`)
  }
  saveTask(task: Task): Promise<void> {
    return this.api.post(`/tasks`, task)
  }
  deleteTask(taskId: string): Promise<void> {
    return this.api.delete(`/tasks/${taskId}`)
  }
  fetchAIModels(projectId: string): Promise<AIModel[]> {
    return this.api.get<AIModel[]>(`/projects/${projectId}/ai-models`)
  }
  saveAIModel(aiModel: AIModel): Promise<void> {
    return this.api.post(`/ai-models`, aiModel)
  }
  deleteAIModel(aiModelId: string): Promise<void> {
    return this.api.delete(`/ai-models/${aiModelId}`)
  }
  fetchSettings(): Promise<Settings[]> {
    return this.api.get<Settings[]>(`/settings`)
  }
  saveOrUpdateSettings(settings: Settings): Promise<void> {
    return this.api.post(`/settings`, settings)
  }
  fetchUsers(): Promise<User[]> {
    return this.api.get<User[]>(`/users`)
  }
  saveUser(user: User): Promise<void> {
    return this.api.post(`/users`, user)
  }
  deleteUser(userId: string): Promise<void> {
    return this.api.delete(`/users/${userId}`)
  }
  login(username: string, password: string): Promise<User> {
    return this.api.post(`/login`, { username, password })
  }
  logout(): Promise<void> {
    return this.api.get(`/logout`)
  }
  syncData(): Promise<void> {
    return this.api.get(`/sync`)
  }
}
