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

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: ":memory:",
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
