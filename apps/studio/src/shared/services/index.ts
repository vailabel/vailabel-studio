import { aiModelsService } from "./ai-models-service"
import { analysisService } from "./analysis-service"
import { annotationsService } from "./annotations-service"
import { cloudStorageService } from "./cloud-service"
import { historyService } from "./history-service"
import { itemsService } from "./images-service"
import { labelsService } from "./labels-service"
import { predictionsService } from "./predictions-service"
import { projectsService } from "./projects-service"
import { settingsService } from "./settings-service"
import { videoService } from "./video-service"

export const services = {
  getProjectService: () => projectsService,
  getLabelService: () => labelsService,
  getItemService: () => itemsService,
  getAnnotationService: () => annotationsService,
  getSettingsService: () => settingsService,
  getAIModelService: () => aiModelsService,
  getHistoryService: () => historyService,
  getPredictionService: () => predictionsService,
  getAnalysisService: () => analysisService,
  getVideoService: () => videoService,
  getCloudStorageService: () => cloudStorageService,
}
