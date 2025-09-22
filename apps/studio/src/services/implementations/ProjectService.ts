import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { IProjectService, CurrentProject } from "../contracts/IProjectService"
import { Project, ImageData } from "@vailabel/core"

export class ProjectService implements IProjectService {
  private dataAdapter: IDataAdapter
  private imageIdListCache: Record<string, string[]> = {}
  private imageDataCache: Record<string, Record<string, ImageData | undefined>> = {}

  constructor(dataAdapter: IDataAdapter) {
    this.dataAdapter = dataAdapter
  }

  async getProjects(): Promise<Project[]> {
    return await this.dataAdapter.fetchProjects()
  }

  async getProject(id: string): Promise<CurrentProject | undefined> {
    const projects = await this.dataAdapter.fetchProjects()
    const project = projects.find((p) => p.id === id)
    
    if (!project) return undefined

    // Get image and label counts
    const [images, labels] = await Promise.all([
      this.dataAdapter.fetchImageDataByProjectId(id),
      this.dataAdapter.fetchLabels(id)
    ])

    return {
      ...project,
      imageCount: images.length,
      labelCount: labels.length,
    }
  }

  async createProject(project: Project): Promise<void> {
    await this.dataAdapter.saveProject(project)
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    await this.dataAdapter.updateProject(id, updates)
  }

  async deleteProject(id: string): Promise<void> {
    await this.dataAdapter.deleteProject(id)
    this.clearImageCache(id)
  }

  async getNextImage(projectId: string, currentImageId: string): Promise<{ id: string; hasNext: boolean }> {
    // Ensure id list cache exists
    let idList = this.imageIdListCache[projectId]
    if (!idList || idList.length === 0) {
      const all = await this.dataAdapter.fetchImageDataByProjectId(projectId)
      idList = all.map((img) => img.id)
      this.imageIdListCache[projectId] = idList
    }

    const idx = idList.findIndex((id) => id === currentImageId)
    const nextIndex = idx >= 0 ? idx + 1 : 0
    const hasNext = nextIndex < idList.length
    const nextId = hasNext ? idList[nextIndex] : ""

    // Prefetch next window (lazy): fetch up to 10 images starting at nextIndex
    if (hasNext) {
      const start = nextIndex
      const limit = 10
      try {
        const images = await this.dataAdapter.fetchImageDataRange(projectId, start, limit)
        const projectCache = this.imageDataCache[projectId] || {}
        images.forEach((img) => (projectCache[img.id] = img))
        this.imageDataCache[projectId] = projectCache
      } catch {
        // ignore
      }
    }

    return { id: nextId, hasNext }
  }

  async getPreviousImage(projectId: string, currentImageId: string): Promise<{ id: string; hasPrevious: boolean }> {
    // Ensure id list cache exists
    let idList = this.imageIdListCache[projectId]
    if (!idList || idList.length === 0) {
      const all = await this.dataAdapter.fetchImageDataByProjectId(projectId)
      idList = all.map((img) => img.id)
      this.imageIdListCache[projectId] = idList
    }

    const idx = idList.findIndex((id) => id === currentImageId)
    const prevIndex = idx >= 0 ? idx - 1 : -1
    const hasPrevious = prevIndex >= 0
    const prevId = hasPrevious ? idList[prevIndex] : ""

    // Prefetch previous window (lazy): fetch up to 10 images ending at prevIndex
    if (hasPrevious) {
      const end = prevIndex
      const limit = 10
      const start = Math.max(0, end - (limit - 1))
      try {
        const images = await this.dataAdapter.fetchImageDataRange(projectId, start, limit)
        const projectCache = this.imageDataCache[projectId] || {}
        images.forEach((img) => (projectCache[img.id] = img))
        this.imageDataCache[projectId] = projectCache
      } catch {
        // ignore
      }
    }

    return { id: prevId, hasPrevious }
  }

  clearImageCache(projectId: string): void {
    this.imageIdListCache[projectId] = []
    this.imageDataCache[projectId] = {}
  }
}
