import { invoke } from "@tauri-apps/api/core"
import type {
  AIModel,
  Annotation,
  History,
  ImageData,
  Label,
  ModelImportPayload,
  Prediction,
  Project,
  Settings,
  Task,
} from "@vailabel/core"

interface SuccessResponse {
  success: boolean
}

interface ImageRangeRequest {
  projectId: string
  offset?: number
  limit?: number
}

interface PredictionGenerateRequest {
  imageId: string
  modelId: string
  threshold?: number
}

const call = <T>(command: string, args?: Record<string, unknown>) =>
  invoke<T>(command, args)

export const studioCommands = {
  health: () => call<boolean>("health"),
  projectsList: () => call<Project[]>("projects_list"),
  projectsGet: (id: string) => call<Project>("projects_get", { payload: { id } }),
  projectsSave: (payload: Partial<Project>) =>
    call<Project>("projects_save", { payload }),
  projectsDelete: (id: string) =>
    call<SuccessResponse>("projects_delete", { payload: { id } }),

  tasksList: () => call<Task[]>("tasks_list"),
  tasksListByProject: (projectId: string) =>
    call<Task[]>("tasks_list_by_project", { payload: { projectId } }),
  tasksGet: (id: string) => call<Task>("tasks_get", { payload: { id } }),
  tasksSave: (payload: Partial<Task>) => call<Task>("tasks_save", { payload }),
  tasksDelete: (id: string) =>
    call<SuccessResponse>("tasks_delete", { payload: { id } }),

  labelsListByProject: (projectId: string) =>
    call<Label[]>("labels_list_by_project", { payload: { projectId } }),
  labelsSave: (payload: Partial<Label>) => call<Label>("labels_save", { payload }),
  labelsDelete: (id: string) =>
    call<SuccessResponse>("labels_delete", { payload: { id } }),

  imagesListByProject: (projectId: string) =>
    call<ImageData[]>("images_list_by_project", { payload: { projectId } }),
  imagesListRange: ({ projectId, offset, limit }: ImageRangeRequest) =>
    call<ImageData[]>("images_list_range", {
      payload: { projectId, offset, limit },
    }),
  imagesGet: (id: string) => call<ImageData>("images_get", { payload: { id } }),
  imagesSave: (payload: Partial<ImageData>) =>
    call<ImageData>("images_save", { payload }),
  imagesDelete: (id: string) =>
    call<SuccessResponse>("images_delete", { payload: { id } }),

  annotationsListByProject: (projectId: string) =>
    call<Annotation[]>("annotations_list_by_project", {
      payload: { projectId },
    }),
  annotationsListByImage: (imageId: string) =>
    call<Annotation[]>("annotations_list_by_image", { payload: { imageId } }),
  annotationsSave: (payload: Partial<Annotation>) =>
    call<Annotation>("annotations_save", { payload }),
  annotationsDelete: (id: string) =>
    call<SuccessResponse>("annotations_delete", { payload: { id } }),

  historyListByProject: (projectId: string) =>
    call<History[]>("history_list_by_project", { payload: { projectId } }),
  historySave: (payload: Partial<History>) =>
    call<History>("history_save", { payload }),

  settingsList: () => call<Settings[]>("settings_list"),
  settingsGet: (key: string) =>
    call<Settings>("settings_get", { payload: { id: key } }),
  settingsSet: (key: string, value: string) =>
    call<Settings>("settings_set", { payload: { key, value } }),

  aiModelsList: () => call<AIModel[]>("ai_models_list"),
  aiModelsListByProject: (projectId: string) =>
    call<AIModel[]>("ai_models_list_by_project", { payload: { projectId } }),
  aiModelsSave: (payload: Partial<AIModel>) =>
    call<AIModel>("ai_models_save", { payload }),
  aiModelsDelete: (id: string) =>
    call<SuccessResponse>("ai_models_delete", { payload: { id } }),
  aiModelsSetActive: (modelId: string) =>
    call<AIModel>("ai_models_set_active", { payload: { modelId } }),
  aiModelsImport: (payload: ModelImportPayload) =>
    call<AIModel>("ai_models_import", { payload }),

  predictionsListByImage: (imageId: string) =>
    call<Prediction[]>("predictions_list_by_image", { payload: { imageId } }),
  predictionsGenerate: (payload: PredictionGenerateRequest) =>
    call<Prediction[]>("predictions_generate", { payload }),
  predictionsAccept: (predictionId: string) =>
    call<Annotation>("predictions_accept", { payload: { predictionId } }),
  predictionsReject: (predictionId: string) =>
    call<SuccessResponse>("predictions_reject", {
      payload: { predictionId },
    }),
}

export type StudioCommands = typeof studioCommands
