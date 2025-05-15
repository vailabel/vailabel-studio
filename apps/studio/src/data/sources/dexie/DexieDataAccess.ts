import { VisionDatabase } from "@/data/db/dexieDb"
import { IDataAccess } from "@/data/interface/IDataAccess"
import { Project, ImageData, Annotation, Label, History } from "@/models/types"

export class DexieDataAccess implements IDataAccess {
  
  private db: VisionDatabase
  constructor(db: VisionDatabase) {
    this.db = db
  }

  async getProjects(): Promise<Project[]> {
    return this.db.projects.toArray()
  }
  async getProjectById(id: string): Promise<Project | undefined> {
    return this.db.projects.get(id)
  }

  async getImages(projectId: string): Promise<ImageData[]> {
    return this.db.images.where("projectId").equals(projectId).toArray()
  }

  async getAnnotations(imageId: string): Promise<Annotation[]> {
    return this.db.annotations.where("imageId").equals(imageId).toArray()
  }

  // Add methods for creating, updating, and deleting records
  async createProject(project: Project): Promise<void> {
    await this.db.projects.add(project)
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    await this.db.projects.update(id, updates)
  }

  async deleteProject(id: string): Promise<void> {
    await this.db.projects.delete(id)
  }

  async createImage(image: ImageData): Promise<void> {
    await this.db.images.add(image)
  }

  async updateImage(id: string, updates: Partial<ImageData>): Promise<void> {
    await this.db.images.update(id, updates)
  }

  async deleteImage(id: string): Promise<void> {
    await this.db.images.delete(id)
  }

  async createAnnotation(annotation: Annotation): Promise<void> {
    await this.db.annotations.add(annotation)
  }

  async updateAnnotation(
    id: string,
    updates: Partial<Annotation>
  ): Promise<void> {
    await this.db.annotations.update(id, updates)
  }

  async deleteAnnotation(id: string): Promise<void> {
    await this.db.annotations.delete(id)
  }

  // Add methods for settings and history management
  async getSettings(): Promise<{ key: string; value: string }[]> {
    return this.db.settings.toArray()
  }

  async updateSetting(key: string, value: string): Promise<void> {
    await this.db.settings.put({ key, value })
  }

  async getHistory(): Promise<History[]> {
    return this.db.history.toArray()
  }

  async updateHistory(history: History): Promise<void> {
    await this.db.history.put(history)
  }

  // Add pagination and filtering support
  async getImagesWithPagination(
    projectId: string,
    offset: number,
    limit: number
  ): Promise<ImageData[]> {
    return this.db.images
      .where("projectId")
      .equals(projectId)
      .offset(offset)
      .limit(limit)
      .toArray()
  }

  async getAnnotationsWithFilter(
    imageId: string,
    filter: Partial<Annotation>
  ): Promise<Annotation[]> {
    let query = this.db.annotations.where("imageId").equals(imageId)
    for (const [key, value] of Object.entries(filter)) {
      query = query.filter((item) => item[key as keyof Annotation] === value)
    }
    return query.toArray()
  }

  async createLabel(label: Label, annotationIds: string[]): Promise<void> {
    // Add the label to the labels table
    await this.db.labels.add(label)

    // Update the annotations to associate them with the label
    for (const annotationId of annotationIds) {
      await this.db.annotations.update(annotationId, { labelId: label.id })
    }
  }

  async getLabels(): Promise<Label[]> {
    return this.db.labels.toArray()
  }

  async getLabelById(id: string): Promise<Label | undefined> {
    return this.db.labels.get(id)
  }

  async updateLabel(id: string, updates: Partial<Label>): Promise<void> {
    await this.db.labels.update(id, updates)
  }

  async deleteLabel(id: string): Promise<void> {
    await this.db.labels.delete(id)
  }

  // Implement getNextImageId
  async getNextImageId(currentImageId: string): Promise<string | null> {
    const currentImage = await this.db.images.get(currentImageId)
    if (!currentImage) return null

    const nextImage = await this.db.images
      .where("projectId")
      .equals(currentImage.projectId)
      .and((img) => img.id > currentImageId)
      .first()

    return nextImage ? nextImage.id : null
  }

  // Implement getPreviousImageId
  async getPreviousImageId(currentImageId: string): Promise<string | null> {
    const currentImage = await this.db.images.get(currentImageId)
    if (!currentImage) return null

    const prevImage = await this.db.images
      .where("projectId")
      .equals(currentImage.projectId)
      .and((img) => img.id < currentImageId)
      .last()

    return prevImage ? prevImage.id : null
  }
}