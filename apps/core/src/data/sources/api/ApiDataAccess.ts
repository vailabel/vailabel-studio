import { IDataAccess } from "@vailabel/core/src/data/interface/IDataAccess"
import type {
  Project,
  ImageData,
  Annotation,
  Label,
  History,
} from "../../../models/types"
import { ApiClient } from "@vailabel/core/src/data/sources/api/ApiClient"

const api = new ApiClient()

export class ApiDataAccess implements IDataAccess {
  getProjectWithImages(id: string): Promise<Project | undefined> {
    return api.get<Project>(`/projects/${id}`)
  }
  async getNextImageId(currentImageId: string): Promise<string | null> {
    return api.get<string | null>(`/images/${currentImageId}/next`)
  }
  async getPreviousImageId(currentImageId: string): Promise<string | null> {
    return api.get<string | null>(`/images/${currentImageId}/previous`)
  }
  async deleteLabel(id: string): Promise<void> {
    await api.delete(`/labels/${id}`)
  }
  async getProjects(): Promise<Project[]> {
    return api.get<Project[]>("/projects")
  }
  async getProjectById(id: string): Promise<Project | undefined> {
    return api.get<Project>(`/projects/${id}`)
  }
  async getImages(projectId: string): Promise<ImageData[]> {
    return api.get<ImageData[]>(`/projects/${projectId}/images`)
  }
  async getAnnotations(imageId: string): Promise<Annotation[]> {
    return api.get<Annotation[]>(`/images/${imageId}/annotations`)
  }
  async createProject(project: Project): Promise<void> {
    await api.post("/projects", project)
  }
  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    await api.put(`/projects/${id}`, updates)
  }
  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`)
  }
  async createImage(image: ImageData): Promise<void> {
    await api.post("/images", image)
  }
  async updateImage(id: string, updates: Partial<ImageData>): Promise<void> {
    await api.put(`/images/${id}`, updates)
  }
  async deleteImage(id: string): Promise<void> {
    await api.delete(`/images/${id}`)
  }
  async createAnnotation(annotation: Annotation): Promise<void> {
    await api.post("/annotations", annotation)
  }
  async updateAnnotation(
    id: string,
    updates: Partial<Annotation>
  ): Promise<void> {
    await api.put(`/annotations/${id}`, updates)
  }
  async deleteAnnotation(id: string): Promise<void> {
    await api.delete(`/annotations/${id}`)
  }
  async getSettings(): Promise<{ key: string; value: string }[]> {
    return api.get<{ key: string; value: string }[]>("/settings")
  }
  async updateSetting(key: string, value: string): Promise<void> {
    await api.put(`/settings/${key}`, { value })
  }
  async getHistory(): Promise<History[]> {
    return api.get<History[]>("/history")
  }
  async updateHistory(history: History): Promise<void> {
    await api.put("/history", history)
  }
  async getImagesWithPagination(
    projectId: string,
    offset: number,
    limit: number
  ): Promise<ImageData[]> {
    return api.get<ImageData[]>(
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
    return api.get<Annotation[]>(`/images/${imageId}/annotations?${query}`)
  }
  async createLabel(label: Label, annotationIds: string[]): Promise<void> {
    await api.post("/labels", label)
    for (const annotationId of annotationIds) {
      await api.put(`/annotations/${annotationId}`, { labelId: label.id })
    }
  }
  async getLabels(): Promise<Label[]> {
    return api.get<Label[]>("/labels")
  }
  async getLabelById(id: string): Promise<Label | undefined> {
    return api.get<Label>(`/labels/${id}`)
  }
  async updateLabel(id: string, updates: Partial<Label>): Promise<void> {
    await api.put(`/labels/${id}`, updates)
  }
}
