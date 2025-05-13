import type { Label, Project, ImageData, Annotation, History } from "./types"
import { db } from "./db"

// Define the interface for the Data Access Layer
export interface IDataAccess {
  getProjects(): Promise<Project[]>
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

// Dexie-based implementation of the Data Access Layer
export class DexieDataAccess implements IDataAccess {
  async getProjects(): Promise<Project[]> {
    return db.projects.toArray()
  }

  async getImages(projectId: string): Promise<ImageData[]> {
    return db.images.where("projectId").equals(projectId).toArray()
  }

  async getAnnotations(imageId: string): Promise<Annotation[]> {
    return db.annotations.where("imageId").equals(imageId).toArray()
  }

  // Add methods for creating, updating, and deleting records
  async createProject(project: Project): Promise<void> {
    await db.projects.add(project)
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    await db.projects.update(id, updates)
  }

  async deleteProject(id: string): Promise<void> {
    await db.projects.delete(id)
  }

  async createImage(image: ImageData): Promise<void> {
    await db.images.add(image)
  }

  async updateImage(id: string, updates: Partial<ImageData>): Promise<void> {
    await db.images.update(id, updates)
  }

  async deleteImage(id: string): Promise<void> {
    await db.images.delete(id)
  }

  async createAnnotation(annotation: Annotation): Promise<void> {
    await db.annotations.add(annotation)
  }

  async updateAnnotation(
    id: string,
    updates: Partial<Annotation>
  ): Promise<void> {
    await db.annotations.update(id, updates)
  }

  async deleteAnnotation(id: string): Promise<void> {
    await db.annotations.delete(id)
  }

  // Add methods for settings and history management
  async getSettings(): Promise<{ key: string; value: string }[]> {
    return db.settings.toArray()
  }

  async updateSetting(key: string, value: string): Promise<void> {
    await db.settings.put({ key, value })
  }

  async getHistory(): Promise<History[]> {
    return db.history.toArray()
  }

  async updateHistory(history: History): Promise<void> {
    await db.history.put(history)
  }

  // Add pagination and filtering support
  async getImagesWithPagination(
    projectId: string,
    offset: number,
    limit: number
  ): Promise<ImageData[]> {
    return db.images
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
    let query = db.annotations.where("imageId").equals(imageId)
    for (const [key, value] of Object.entries(filter)) {
      query = query.filter((item) => item[key as keyof Annotation] === value)
    }
    return query.toArray()
  }

  async createLabel(label: Label, annotationIds: string[]): Promise<void> {
    // Add the label to the labels table
    await db.labels.add(label)

    // Update the annotations to associate them with the label
    for (const annotationId of annotationIds) {
      await db.annotations.update(annotationId, { labelId: label.id })
    }
  }

  async getLabels(): Promise<Label[]> {
    return db.labels.toArray()
  }

  async getLabelById(id: string): Promise<Label | undefined> {
    return db.labels.get(id)
  }

  async updateLabel(id: string, updates: Partial<Label>): Promise<void> {
    await db.labels.update(id, updates)
  }

  async deleteLabel(id: string): Promise<void> {
    await db.labels.delete(id)
  }

  // Implement getNextImageId
  async getNextImageId(currentImageId: string): Promise<string | null> {
    const currentImage = await db.images.get(currentImageId)
    if (!currentImage) return null

    const nextImage = await db.images
      .where("projectId")
      .equals(currentImage.projectId)
      .and((img) => img.id > currentImageId)
      .first()

    return nextImage ? nextImage.id : null
  }

  // Implement getPreviousImageId
  async getPreviousImageId(currentImageId: string): Promise<string | null> {
    const currentImage = await db.images.get(currentImageId)
    if (!currentImage) return null

    const prevImage = await db.images
      .where("projectId")
      .equals(currentImage.projectId)
      .and((img) => img.id < currentImageId)
      .last()

    return prevImage ? prevImage.id : null
  }
}

// Placeholder for API-based implementation
export class ApiDataAccess implements IDataAccess {
  async getProjects(): Promise<Project[]> {
    // Replace with actual API call
    return fetch("/api/projects").then((res) => res.json())
  }

  async getImages(projectId: string): Promise<ImageData[]> {
    // Replace with actual API call
    return fetch(`/api/projects/${projectId}/images`).then((res) => res.json())
  }

  async getAnnotations(imageId: string): Promise<Annotation[]> {
    // Replace with actual API call
    return fetch(`/api/images/${imageId}/annotations`).then((res) => res.json())
  }

  async createProject(project: Project): Promise<void> {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    })
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
  }

  async deleteProject(id: string): Promise<void> {
    await fetch(`/api/projects/${id}`, { method: "DELETE" })
  }

  async createImage(image: ImageData): Promise<void> {
    await fetch("/api/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(image),
    })
  }

  async updateImage(id: string, updates: Partial<ImageData>): Promise<void> {
    await fetch(`/api/images/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
  }

  async deleteImage(id: string): Promise<void> {
    await fetch(`/api/images/${id}`, { method: "DELETE" })
  }

  async createAnnotation(annotation: Annotation): Promise<void> {
    await fetch("/api/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(annotation),
    })
  }

  async updateAnnotation(
    id: string,
    updates: Partial<Annotation>
  ): Promise<void> {
    await fetch(`/api/annotations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
  }

  async deleteAnnotation(id: string): Promise<void> {
    await fetch(`/api/annotations/${id}`, { method: "DELETE" })
  }

  async getSettings(): Promise<{ key: string; value: string }[]> {
    return fetch("/api/settings").then((res) => res.json())
  }

  async updateSetting(key: string, value: string): Promise<void> {
    await fetch(`/api/settings/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    })
  }

  async getHistory(): Promise<History[]> {
    return fetch("/api/history").then((res) => res.json())
  }

  async updateHistory(history: History): Promise<void> {
    await fetch("/api/history", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(history),
    })
  }

  async getImagesWithPagination(
    projectId: string,
    offset: number,
    limit: number
  ): Promise<ImageData[]> {
    return fetch(
      `/api/projects/${projectId}/images?offset=${offset}&limit=${limit}`
    ).then((res) => res.json())
  }

  async getAnnotationsWithFilter(
    imageId: string,
    filter: Partial<Annotation>
  ): Promise<Annotation[]> {
    const query = new URLSearchParams(
      filter as Record<string, string>
    ).toString()
    return fetch(`/api/images/${imageId}/annotations?${query}`).then((res) =>
      res.json()
    )
  }

  async createLabel(label: Label, annotationIds: string[]): Promise<void> {
    // Create the label via API
    await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(label),
    })

    // Associate the label with annotations via API
    for (const annotationId of annotationIds) {
      await fetch(`/api/annotations/${annotationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId: label.id }),
      })
    }
  }

  async getLabels(): Promise<Label[]> {
    return fetch("/api/labels").then((res) => res.json())
  }

  async getLabelById(id: string): Promise<Label | undefined> {
    return fetch(`/api/labels/${id}`).then((res) => res.json())
  }

  async updateLabel(id: string, updates: Partial<Label>): Promise<void> {
    await fetch(`/api/labels/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
  }

  async deleteLabel(id: string): Promise<void> {
    await fetch(`/api/labels/${id}`, { method: "DELETE" })
  }

  async getNextImageId(currentImageId: string): Promise<string | null> {
    // Implement API call to fetch the next image ID
    return fetch(`/api/images/${currentImageId}/next`).then((res) => res.json())
  }

  async getPreviousImageId(currentImageId: string): Promise<string | null> {
    // Implement API call to fetch the previous image ID
    return fetch(`/api/images/${currentImageId}/previous`).then((res) =>
      res.json()
    )
  }
}
