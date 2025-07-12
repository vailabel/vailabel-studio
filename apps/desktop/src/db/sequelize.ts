import { Sequelize } from "sequelize-typescript"
import {
  ProjectRepository,
  LabelRepository,
  AnnotationRepository,
  ImageDataRepository,
  HistoryRepository,
  ExportFormatRepository,
  AIModelRepository,
  SettingsRepository,
  TaskRepository,
} from "./models"
import { app } from "electron" // Import Electron's app module
import path from "path"

const dbPath = path.join(app.getPath("userData"), "database.sqlite")

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: dbPath, // Use app data directory for storage
  models: [
    ProjectRepository,
    LabelRepository,
    AnnotationRepository,
    ImageDataRepository,
    HistoryRepository,
    ExportFormatRepository,
    AIModelRepository,
    SettingsRepository,
    TaskRepository,
  ],
  logging: true,
})
