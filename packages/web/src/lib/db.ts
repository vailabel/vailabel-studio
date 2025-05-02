import Dexie, { type Table } from "dexie"
import type { Label, Project, ImageData, Annotation, History } from "./types"

class VisionDatabase extends Dexie {
  projects!: Table<Project>
  images!: Table<ImageData>
  labels!: Table<Label>
  annotations!: Table<Annotation>
  history!: Table<History>
  settings!: Table<{ key: string; value: string }>

  constructor() {
    super("vision-ai-label-studio")

    this.version(1).stores({
      projects: "id, name, createdAt, lastModified",
      images: "id, name, projectId, createdAt",
      labels: "id, name, category, projectId, color, isAIGenerated",
      settings: "key, value",
      annotations: "id, name, type, coordinates, imageId, createdAt",
      history: "labels, historyIndex, canUndo, canRedo",
    })
  }

  getAnnotationsByImageId(imageId: string) {
    return this.annotations.where("imageId").equals(imageId).toArray()
  }
}

export const db = new VisionDatabase()
