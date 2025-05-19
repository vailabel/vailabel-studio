import Dexie, { type Table } from "dexie"
import type {
  Label,
  Project,
  ImageData,
  Annotation,
  History,
  AIModel,
} from "../../models/types"

export class VisionDatabase extends Dexie {
  projects!: Table<Project>
  images!: Table<ImageData>
  labels!: Table<Label>
  annotations!: Table<Annotation>
  history!: Table<History>
  settings!: Table<{ key: string; value: string }>
  aiModels!: Table<AIModel>

  constructor() {
    super("vision-ai-label-studio")

    this.version(1).stores({
      projects: "id, name, createdAt, lastModified",
      images: "id, name, projectId, createdAt",
      labels: "id, name, category, projectId, color, isAIGenerated",
      settings: "key, value",
      annotations: "id, name, type, coordinates, imageId, createdAt",
      history: "id, labels, historyIndex, canUndo, canRedo",
      aiModels: "id, name, description, version, createdAt, updatedAt, modelPath, configPath, modelSize, isCustom",
    })
  }
}

export const db: VisionDatabase = new VisionDatabase()
