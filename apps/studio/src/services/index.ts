import { aiModelsService } from "./ai-models-service"
import { annotationsService } from "./annotations-service"
import { historyService } from "./history-service"
import { imagesService } from "./images-service"
import { labelsService } from "./labels-service"
import { predictionsService } from "./predictions-service"
import { projectsService } from "./projects-service"
import { settingsService } from "./settings-service"
import { tasksService } from "./tasks-service"

export const services = {
  getProjectService: () => projectsService,
  getTaskService: () => tasksService,
  getLabelService: () => labelsService,
  getImageService: () => imagesService,
  getAnnotationService: () => annotationsService,
  getSettingsService: () => settingsService,
  getAIModelService: () => aiModelsService,
  getHistoryService: () => historyService,
  getPredictionService: () => predictionsService,
}
