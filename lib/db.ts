import Dexie, { type Table } from "dexie"
import type { Label, Project, ImageData } from "./types"

class LabelingDatabase extends Dexie {
  projects!: Table<Project>
  images!: Table<ImageData>
  labels!: Table<Label>

  constructor() {
    super("LabelingDatabase")

    this.version(1).stores({
      projects: "id, name, createdAt, lastModified",
      images: "id, name, projectId, createdAt",
      labels: "id, name, type, imageId, createdAt, updatedAt",
    })
  }
}

export const db = new LabelingDatabase()
