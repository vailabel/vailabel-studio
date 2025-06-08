import { Sequelize } from 'sequelize-typescript';
import { Project, Label, Annotation, ImageData, History, ExportFormat, AIModel, Settings, Task } from '@vailabel/core/models';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './app.db',
  models: [Project, Label, Annotation, ImageData, History, ExportFormat, AIModel, Settings, Task],
  logging: false,
});
