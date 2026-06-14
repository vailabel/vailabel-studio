import { invokeWithLogging } from "@/ipc/invoke"
import type { GitHubRelease } from "@/lib/github-releases"
import type {
  AiGpuInfo,
  AiRegistryModel,
  CopilotApplyAction,
  CopilotTurnRequest,
  CopilotTurnResult,
  RuntimeInstallResult,
  RuntimeInstallStatus,
} from "@/types/ai-assistant"
import type {
  AnalysisConfig,
  AnalysisJob,
  AnalysisReport,
  ReportSummary,
} from "@/types/dataset-intelligence"
import type {
  AIModel,
  Annotation,
  History,
  ImageData,
  Label,
  ModelInstallPayload,
  ModelImportPayload,
  Prediction,
  Project,
  Settings,
} from "@/types/core"
import type {
  FfmpegInfo,
  ImportVideoRequest,
  IngestOptions,
  MaterializedShape,
  Track,
  VideoJob,
  VideoMeta,
} from "@/types/video"

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

/** A foreground/background click for interactive segmentation. */
export interface PipelinePromptPoint {
  x: number
  y: number
  positive?: boolean
}

/** A box prompt (SAM box, or a region to segment) in image-space coordinates. */
export interface PipelinePromptBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface PipelinePrompt {
  points?: PipelinePromptPoint[]
  boxes?: PipelinePromptBox[]
  text?: string
}

/** Prompt-driven inference run (SAM segment, open-vocab detect). Mirrors the
 *  Rust `PipelineRunPayload`. `registryId` overrides plugin selection; when
 *  omitted the backend derives it from the model entity. */
export interface PipelineRunRequest {
  imageId: string
  modelId: string
  registryId?: string
  threshold?: number
  prompt?: PipelinePrompt
}

interface GitHubReleaseLookupRequest {
  owner: string
  repo: string
}

const call = <T>(command: string, args?: Record<string, unknown>) =>
  invokeWithLogging<T>(command, args)

export const studioCommands = {
  health: () => call<boolean>("health"),
  projectsList: () => call<Project[]>("projects_list"),
  projectsGet: (id: string) => call<Project>("projects_get", { payload: { id } }),
  projectsSave: (payload: Partial<Project>) =>
    call<Project>("projects_save", { payload }),
  projectsDelete: (id: string) =>
    call<SuccessResponse>("projects_delete", { payload: { id } }),

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
  aiModelsInstall: (payload: ModelInstallPayload) =>
    call<AIModel>("ai_models_install", { payload }),
  aiModelsCatalogReleases: (payload: GitHubReleaseLookupRequest) =>
    call<GitHubRelease[]>("ai_models_catalog_releases", { payload }),

  predictionsListByImage: (imageId: string) =>
    call<Prediction[]>("predictions_list_by_image", { payload: { imageId } }),
  predictionsGenerate: (payload: PredictionGenerateRequest) =>
    call<Prediction[]>("predictions_generate", { payload }),
  pipelineRun: (payload: PipelineRunRequest) =>
    call<Prediction[]>("pipeline_run", { payload }),
  predictionsAccept: (predictionId: string) =>
    call<Annotation>("predictions_accept", { payload: { predictionId } }),
  predictionsReject: (predictionId: string) =>
    call<SuccessResponse>("predictions_reject", {
      payload: { predictionId },
    }),

  // Local AI assistant (Phase 1): GPU/runtime detection + model registry.
  aiGpuInfo: () => call<AiGpuInfo>("ai_gpu_info"),
  aiModelRegistry: () => call<AiRegistryModel[]>("ai_model_registry"),

  // ONNX Runtime auto-installer: download onnxruntime.dll (+ cuDNN) on demand.
  aiRuntimeStatus: () => call<RuntimeInstallStatus>("ai_runtime_status"),
  aiRuntimeInstall: (gpu = true) =>
    call<RuntimeInstallResult>("ai_runtime_install", { payload: { gpu } }),
  aiRuntimeRestart: () => call<void>("ai_runtime_restart"),

  // Local AI copilot: chat-driven labeling assistant over the local detector.
  aiCopilotTurn: (payload: CopilotTurnRequest) =>
    call<CopilotTurnResult>("ai_copilot_turn", { payload }),
  aiCopilotApplyAction: (payload: CopilotApplyAction) =>
    call<unknown>("ai_copilot_apply_action", { payload }),

  // Dataset Intelligence (Phase 2): analysis jobs + persisted reports.
  analysisRun: (payload: { projectId: string; config?: AnalysisConfig }) =>
    call<AnalysisJob>("analysis_run", { payload }),
  analysisJobStatus: (jobId: string) =>
    call<AnalysisJob | null>("analysis_job_status", { payload: { jobId } }),
  analysisReportsList: (projectId: string) =>
    call<ReportSummary[]>("analysis_reports_list", { payload: { projectId } }),
  analysisReportGet: (id: string) =>
    call<AnalysisReport | null>("analysis_report_get", { payload: { id } }),
  analysisReportLatest: (projectId: string) =>
    call<AnalysisReport | null>("analysis_report_latest", {
      payload: { projectId },
    }),
  analysisReportDelete: (id: string) =>
    call<SuccessResponse>("analysis_report_delete", { payload: { id } }),

  // Video Annotation (Phase 5): FFmpeg pipeline, tracks, export.
  videoFfmpegInfo: () => call<FfmpegInfo>("video_ffmpeg_info"),
  videoImport: (payload: ImportVideoRequest) =>
    call<VideoMeta>("video_import", { payload }),
  videoList: (projectId: string) =>
    call<VideoMeta[]>("video_list", { payload: { projectId } }),
  videoGet: (id: string) => call<VideoMeta | null>("video_get", { payload: { id } }),
  videoDelete: (id: string) =>
    call<SuccessResponse>("video_delete", { payload: { id } }),
  videoIngest: (payload: { videoId: string } & IngestOptions) =>
    call<VideoJob>("video_ingest", { payload }),
  videoJobStatus: (jobId: string) =>
    call<VideoJob | null>("video_job_status", { payload: { jobId } }),
  videoTracksList: (videoId: string) =>
    call<Track[]>("video_tracks_list", { payload: { videoId } }),
  videoTrackSave: (payload: Partial<Track>) =>
    call<Track>("video_track_save", { payload }),
  videoTrackDelete: (id: string) =>
    call<SuccessResponse>("video_track_delete", { payload: { id } }),
  videoExportTracks: (payload: {
    videoId: string
    startFrame?: number
    endFrame?: number
    step?: number
  }) => call<MaterializedShape[]>("video_export_tracks", { payload }),
}

export type StudioCommands = typeof studioCommands

