import { Project } from "@vailabel/core"

export interface CurrentProject extends Project {
  imageCount: number
  labelCount: number
}

export interface IProjectService {
  // Project operations
  getProjects(): Promise<Project[]>
  getProject(id: string): Promise<CurrentProject | undefined>
  createProject(project: Project): Promise<void>
  updateProject(id: string, updates: Partial<Project>): Promise<void>
  deleteProject(id: string): Promise<void>
  
  // Image navigation
  getNextImage(projectId: string, currentImageId: string): Promise<{ id: string; hasNext: boolean }>
  getPreviousImage(projectId: string, currentImageId: string): Promise<{ id: string; hasPrevious: boolean }>
  
  // Cache management
  clearImageCache(projectId: string): void
}
