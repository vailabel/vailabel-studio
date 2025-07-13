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
import fs from "fs"

const isDev = !app.isPackaged

const dbFolder = isDev
  ? path.join(__dirname) // Use a relative path in development
  : app.getPath("userData")
const dbPath = path.join(dbFolder, "database.sqlite")

// Ensure the database folder exists
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true }) // Create the folder if it doesn't exist
}

// Ensure the database file exists
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, "") // Create an empty file if it doesn't exist
}

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: dbPath, // Dynamically set storage path based on environment
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
