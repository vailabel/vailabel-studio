import { IDataAccess } from "@vailabel/core/src/data/interface/IDataAccess"
import type {
  Project,
  ImageData,
  Annotation,
  Label,
  History,
  AIModel,
  Settings,
} from "../../../models/types"
import { ApiClient } from "@vailabel/core/src/data/sources/api/ApiClient"

export class ApiDataAccess implements IDataAccess {
  private api: ApiClient

  constructor(apiClient?: ApiClient) {
    this.api = apiClient ?? new ApiClient()
  }
  getAnnotationsByImageId(imageId: string): Promise<Annotation[]> {
    throw new Error("Method not implemented.")
  }
  getSetting(key: string): Promise<Settings | undefined> {
    return this.api.get<Settings | undefined>(`/settings/${key}`)
  }
  getAvailableModels(): Promise<AIModel[]> {
    return this.api.get<AIModel[]>("/models")
  }
  uploadCustomModel(file: AIModel): Promise<void> {
    return this.api.post("/models", file)
  }
  selectModel(modelId: string): Promise<void> {
    return this.api.post(`/models/${modelId}/select`, {})
  }
  getSelectedModel(): Promise<AIModel | undefined> {
    return this.api.get<AIModel | undefined>("/models/selected")
  }
  deleteModel(modelId: string): Promise<void> {
    return this.api.delete(`/models/${modelId}`)
  }

  getProjectWithImages(id: string): Promise<Project | undefined> {
    return this.api.get<Project>(`/projects/${id}`)
  }
  async getNextImageId(currentImageId: string): Promise<string | null> {
    return this.api.get<string | null>(`/images/${currentImageId}/next`)
  }
  async getPreviousImageId(currentImageId: string): Promise<string | null> {
    return this.api.get<string | null>(`/images/${currentImageId}/previous`)
  }
  async deleteLabel(id: string): Promise<void> {
    await this.api.delete(`/labels/${id}`)
  }
  async getProjects(): Promise<Project[]> {
    return this.api.get<Project[]>("/projects")
  }
  async getProjectById(id: string): Promise<Project | undefined> {
    return this.api.get<Project>(`/projects/${id}`)
  }
  async getImages(projectId: string): Promise<ImageData[]> {
    return this.api.get<ImageData[]>(`/projects/${projectId}/images`)
  }
  async getAnnotations(imageId: string): Promise<Annotation[]> {
    return this.api.get<Annotation[]>(`/images/${imageId}/annotations`)
  }
  async createProject(project: Project): Promise<void> {
    await this.api.post("/projects", project)
  }
  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    await this.api.put(`/projects/${id}`, updates)
  }
  async deleteProject(id: string): Promise<void> {
    await this.api.delete(`/projects/${id}`)
  }
  async createImage(image: ImageData): Promise<void> {
    await this.api.post("/images", image)
  }
  async updateImage(id: string, updates: Partial<ImageData>): Promise<void> {
    await this.api.put(`/images/${id}`, updates)
  }
  async deleteImage(id: string): Promise<void> {
    await this.api.delete(`/images/${id}`)
  }
  async createAnnotation(annotation: Annotation): Promise<void> {
    await this.api.post("/annotations", annotation)
  }
  async updateAnnotation(
    id: string,
    updates: Partial<Annotation>
  ): Promise<void> {
    await this.api.put(`/annotations/${id}`, updates)
  }
  async deleteAnnotation(id: string): Promise<void> {
    await this.api.delete(`/annotations/${id}`)
  }
  async getSettings(): Promise<{ key: string; value: string }[]> {
    return this.api.get<{ key: string; value: string }[]>("/settings")
  }
  async updateSetting(key: string, value: string): Promise<void> {
    await this.api.put(`/settings/${key}`, { value })
  }
  async getHistory(): Promise<History[]> {
    return this.api.get<History[]>("/history")
  }
  async updateHistory(history: History): Promise<void> {
    await this.api.put("/history", history)
  }
  async getImagesWithPagination(
    projectId: string,
    offset: number,
    limit: number
  ): Promise<ImageData[]> {
    return this.api.get<ImageData[]>(
      `/projects/${projectId}/images?offset=${offset}&limit=${limit}`
    )
  }
  async getAnnotationsWithFilter(
    imageId: string,
    filter: Partial<Annotation>
  ): Promise<Annotation[]> {
    const query = new URLSearchParams(
      filter as Record<string, string>
    ).toString()
    return this.api.get<Annotation[]>(`/images/${imageId}/annotations?${query}`)
  }
  async createLabel(label: Label, annotationIds: string[]): Promise<void> {
    await this.api.post("/labels", label)
    for (const annotationId of annotationIds) {
      await this.api.put(`/annotations/${annotationId}`, { labelId: label.id })
    }
  }
  async getLabels(): Promise<Label[]> {
    return this.api.get<Label[]>("/labels")
  }
  async getLabelById(id: string): Promise<Label | undefined> {
    return this.api.get<Label>(`/labels/${id}`)
  }
  async updateLabel(id: string, updates: Partial<Label>): Promise<void> {
    await this.api.put(`/labels/${id}`, updates)
  }
}
