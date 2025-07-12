import { Sequelize } from "sequelize-typescript"
import {
  Project,
  Label,
  Annotation,
  ImageData,
  History,
  ExportFormat,
  AIModel,
  Settings,
  Task,
} from "@vailabel/core"
import { app } from "electron" // Import Electron's app module

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: `${app.getPath("userData")}/database.sqlite`, // Use app data directory for storage
  models: [
    Project,
    Label,
    Annotation,
    ImageData,
    History,
    ExportFormat,
    AIModel,
    Settings,
    Task,
  ],
  logging: true,
})
