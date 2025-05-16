import type { Label, Project, ImageData, Annotation, History } from "./types"

// Define the interface for the Data Access Layer
export interface IDataAccess {
  getProjects(): Promise<Project[]>
  getProjectById(id: string): Promise<Project | undefined>
  getImages(projectId: string): Promise<ImageData[]>
  getAnnotations(imageId: string): Promise<Annotation[]>
  // Add more methods as needed

  createProject(project: Project): Promise<void>
  updateProject(id: string, updates: Partial<Project>): Promise<void>
  deleteProject(id: string): Promise<void>

  createImage(image: ImageData): Promise<void>
  updateImage(id: string, updates: Partial<ImageData>): Promise<void>
  deleteImage(id: string): Promise<void>

  createAnnotation(annotation: Annotation): Promise<void>
  updateAnnotation(id: string, updates: Partial<Annotation>): Promise<void>
  deleteAnnotation(id: string): Promise<void>

  createLabel(label: Label, annotationIds: string[]): Promise<void>
  getLabels(): Promise<Label[]>
  getLabelById(id: string): Promise<Label | undefined>
  updateLabel(id: string, updates: Partial<Label>): Promise<void>
  deleteLabel(id: string): Promise<void>

  getSettings(): Promise<{ key: string; value: string }[]>
  updateSetting(key: string, value: string): Promise<void>

  getHistory(): Promise<History[]>
  updateHistory(history: History): Promise<void>

  getImagesWithPagination(
    projectId: string,
    offset: number,
    limit: number
  ): Promise<ImageData[]>
  getAnnotationsWithFilter(
    imageId: string,
    filter: Partial<Annotation>
  ): Promise<Annotation[]>

  // Add methods to fetch next and previous image IDs
  getNextImageId(currentImageId: string): Promise<string | null>
  getPreviousImageId(currentImageId: string): Promise<string | null>

  // Label CRUD methods
  createLabel(label: Label, annotationIds: string[]): Promise<void>
  updateLabel(id: string, updates: Partial<Label>): Promise<void>
  deleteLabel(id: string): Promise<void>
}
