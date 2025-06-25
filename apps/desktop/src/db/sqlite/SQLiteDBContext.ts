import { AIModelDataAccess } from "./AIModelDataAccess"
import { AnnotationDataAccess } from "./AnnotationDataAccess"
import { HistoryDataAccess } from "./HistoryDataAccess"
import { ImageDataAccess } from "./ImageDataAccess"
import { LabelDataAccess } from "./LabelDataAccess"
import { ProjectDataAccess } from "./ProjectDataAccess"
import { SettingsDataAccess } from "./SettingsDataAccess"
import { IDBContext } from "@vailabel/core/data"

export class SQLiteDBContext implements IDBContext {
  public readonly projects: ProjectDataAccess
  public readonly images: ImageDataAccess
  public readonly aiModels: AIModelDataAccess
  public readonly annotations: AnnotationDataAccess
  public readonly labels: LabelDataAccess
  public readonly settings: SettingsDataAccess
  public readonly history: HistoryDataAccess

  constructor() {
    this.projects = new ProjectDataAccess()
    this.images = new ImageDataAccess()
    this.aiModels = new AIModelDataAccess()
    this.annotations = new AnnotationDataAccess()
    this.labels = new LabelDataAccess()
    this.settings = new SettingsDataAccess()
    this.history = new HistoryDataAccess()
  }
}
