import Dexie, { type Table } from "dexie"
import type { Label, Project, ImageData } from "./types"

class LabelingDatabase extends Dexie {
  projects!: Table<Project>
  images!: Table<ImageData>
  labels!: Table<Label>
  settings!: Table<{ key: string; value: string }>

  constructor() {
    super("LabelingDatabase")

    this.version(1).stores({
      projects: "id, name, createdAt, lastModified",
      images: "id, name, projectId, createdAt",
      labels: "id, name, type, imageId, createdAt, updatedAt",
    })

    this.version(2).stores({
      settings: "key",
    })
  }
}

export const db = new LabelingDatabase()
