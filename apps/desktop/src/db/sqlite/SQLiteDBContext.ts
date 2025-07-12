
import { IDBContext } from "@vailabel/core/data"
import { ProjectRepository } from "./ProjectRepository"
import { ImageRepository } from "./ImageRepository"
import { AIModelRepository } from "./AIModelRepository"
import { AnnotationRepository } from "./AnnotationRepository"
import { LabelRepository } from "./LabelRepository"
import { SettingsRepository } from "./SettingsRepository"
import { HistoryRepository } from "./HistoryRepository"

export class SQLiteDBContext implements IDBContext {
  public readonly projects: ProjectRepository
  public readonly images: ImageRepository
  public readonly aiModels: AIModelRepository
  public readonly annotations: AnnotationRepository
  public readonly labels: LabelRepository
  public readonly settings: SettingsRepository
  public readonly history: HistoryRepository

  constructor() {
    this.projects = new ProjectRepository()
    this.images = new ImageRepository()
    this.aiModels = new AIModelRepository()
    this.annotations = new AnnotationRepository()
    this.labels = new LabelRepository()
    this.settings = new SettingsRepository()
    this.history = new HistoryRepository()
  }
}
