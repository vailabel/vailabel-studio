import { invokeWithLogging } from "@/shared/ipc/invoke"
import type { GitHubRelease } from "@/shared/lib/github-releases"
import type {
  AiRegistryModel,
  CopilotApplyAction,
  CopilotTestResult,
  CopilotTurnRequest,
  CopilotTurnResult,
} from "@/shared/types/ai-assistant"
import type {
  AnalysisConfig,
  AnalysisJob,
  AnalysisReport,
  ReportSummary,
} from "@/shared/types/dataset-intelligence"
import type {
  AIModel,
  Annotation,
  History,
  Item,
  Label,
  ModelInstallPayload,
  ModelImportPayload,
  Prediction,
  Project,
  Settings,
} from "@/shared/types/core"
import type {
  FfmpegInfo,
  ImportVideoRequest,
  IngestOptions,
  MaterializedShape,
  Track,
  VideoJob,
  VideoMeta,
} from "@/shared/types/video"
import type {
  DatasetExportRequest,
  DatasetExportResult,
  DatasetImportRequest,
  DatasetImportResult,
  ExportRequest,
  ExportResult,
  GpuProbe,
  RuntimeInstallStatus,
  RuntimeModel,
  RuntimeStatus,
  RuntimeSystemInfo,
  TrainingJob,
  TrainingLogChunk,
  TrainingReport,
  TrainingStartRequest,
} from "@/shared/types/ai-runtime"

export interface SuccessResponse {
  success: boolean
}

interface ImageRangeRequest {
  projectId: string
  offset?: number
  limit?: number
}

export interface ItemPageRequest {
  projectId: string
  offset: number
  limit: number
  /** Optional case-insensitive name filter applied server-side. */
  search?: string
}

export interface ItemPageResult {
  items: Item[]
  total: number
}

interface PredictionGenerateRequest {
  itemId: string
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
  itemId: string
  modelId: string
  registryId?: string
  threshold?: number
  prompt?: PipelinePrompt
}

export interface AutoLabelBacklogRequest {
  projectId: string
  /** Empty/absent → the served/active detector is resolved on the backend. */
  modelId?: string
  threshold?: number
  /** Cap on backlog items processed this run (absent = all). */
  limit?: number
}

export interface AutoLabelBacklogResult {
  /** Backlog items processed this run. */
  items: number
  /** Items that produced at least one prediction. */
  predictedItems: number
  /** Total predictions created. */
  predictions: number
  /** Items skipped due to a per-item error. */
  errors: number
}

export interface PendingPredictionsSummary {
  /** Total un-reviewed predictions across the project. */
  predictions: number
  /** Distinct items carrying predictions. */
  items: number
  /** One item id with predictions, for the "Review" jump target. */
  firstItemId?: string | null
}

export interface BatchAcceptResult {
  accepted: number
  annotations: Annotation[]
}

export interface BatchRejectResult {
  rejected: number
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

  itemsListByProject: (projectId: string) =>
    call<Item[]>("items_list_by_project", { payload: { projectId } }),
  itemsListRange: ({ projectId, offset, limit }: ImageRangeRequest) =>
    call<Item[]>("items_list_range", {
      payload: { projectId, offset, limit },
    }),
  // One page of items + the search-aware total, for server-driven pagination /
  // infinite scroll (the full project is never loaded at once).
  itemsListPage: (payload: ItemPageRequest) =>
    call<ItemPageResult>("items_list_page", { payload }),
  itemsGet: (id: string) => call<Item>("items_get", { payload: { id } }),
  itemsSave: (payload: Partial<Item>) =>
    call<Item>("items_save", { payload }),
  itemsDelete: (id: string) =>
    call<SuccessResponse>("items_delete", { payload: { id } }),

  annotationsListByProject: (projectId: string) =>
    call<Annotation[]>("annotations_list_by_project", {
      payload: { projectId },
    }),
  annotationsListByItem: (itemId: string) =>
    call<Annotation[]>("annotations_list_by_item", { payload: { itemId } }),
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

  predictionsListByItem: (itemId: string) =>
    call<Prediction[]>("predictions_list_by_item", { payload: { itemId } }),
  predictionsGenerate: (payload: PredictionGenerateRequest) =>
    call<Prediction[]>("predictions_generate", { payload }),
  pipelineRun: (payload: PipelineRunRequest) =>
    call<Prediction[]>("pipeline_run", { payload }),
  predictionsAccept: (predictionId: string, labelId?: string) =>
    call<Annotation>("predictions_accept", { payload: { predictionId, labelId } }),
  predictionsReject: (predictionId: string) =>
    call<SuccessResponse>("predictions_reject", {
      payload: { predictionId },
    }),
  /** Accept many predictions in one call (one event + one reload) — "Accept all". */
  predictionsAcceptBatch: (predictionIds: string[]) =>
    call<BatchAcceptResult>("predictions_accept_batch", {
      payload: { predictionIds },
    }),
  /** Reject many predictions in one call (one event + one reload) — "Reject all". */
  predictionsRejectBatch: (predictionIds: string[]) =>
    call<BatchRejectResult>("predictions_reject_batch", {
      payload: { predictionIds },
    }),
  /** Batch-run the served detector over a project's unlabeled items. */
  predictionsAutoLabelBacklog: (payload: AutoLabelBacklogRequest) =>
    call<AutoLabelBacklogResult>("predictions_auto_label_backlog", { payload }),
  /** Project-wide pending-prediction summary for the flywheel "Review N" CTA. */
  predictionsCountByProject: (projectId: string) =>
    call<PendingPredictionsSummary>("predictions_count_by_project", {
      payload: { projectId },
    }),

  // Local AI assistant: capability/model registry (the embedded Python runtime
  // runs the actual inference — see the `runtime*` commands below).
  aiModelRegistry: () => call<AiRegistryModel[]>("ai_model_registry"),

  // Local AI copilot: chat-driven labeling assistant over the local detector.
  aiCopilotTurn: (payload: CopilotTurnRequest) =>
    call<CopilotTurnResult>("ai_copilot_turn", { payload }),
  aiCopilotApplyAction: (payload: CopilotApplyAction) =>
    call<unknown>("ai_copilot_apply_action", { payload }),
  aiCopilotTestConnection: (payload: { baseUrl: string; apiKey?: string }) =>
    call<CopilotTestResult>("ai_copilot_test_connection", { payload }),

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

  // Embedded AI Runtime: lifecycle, model manager, training, export.
  runtimeStart: () => call<RuntimeStatus>("runtime_start"),
  runtimeStop: () => call<RuntimeStatus>("runtime_stop"),
  runtimeRestart: () => call<RuntimeStatus>("runtime_restart"),
  runtimeStatus: () => call<RuntimeStatus>("runtime_status"),
  runtimeLogs: () => call<string>("runtime_logs"),
  runtimeSystemInfo: () => call<RuntimeSystemInfo>("runtime_system_info"),

  // First-run provisioning: the interpreter is downloaded on demand, not bundled.
  runtimeInstallStatus: () =>
    call<RuntimeInstallStatus>("runtime_install_status"),
  runtimeInstall: () => call<RuntimeStatus>("runtime_install"),

  runtimeModelsList: () => call<RuntimeModel[]>("runtime_models_list"),
  runtimeModelsInstall: (id: string) =>
    call<RuntimeModel>("runtime_models_install", { payload: { id } }),
  runtimeModelsDelete: (id: string) =>
    call<SuccessResponse>("runtime_models_delete", { payload: { id } }),

  // GPU acceleration: detect an NVIDIA GPU + one-click install the CUDA torch
  // overlay (then restart the app to activate it).
  runtimeGpuProbe: () => call<GpuProbe>("runtime_gpu_probe"),
  runtimeEnableGpu: (tag?: string) =>
    call<{ ok: boolean; tag: string }>("runtime_enable_gpu", {
      payload: { tag },
    }),
  appRestart: () => call<void>("app_restart"),

  datasetExportYolo: (payload: DatasetExportRequest) =>
    call<DatasetExportResult>("dataset_export_yolo", { payload }),
  datasetImport: (payload: DatasetImportRequest) =>
    call<DatasetImportResult>("dataset_import", { payload }),

  trainingStart: (payload: TrainingStartRequest) =>
    call<TrainingJob>("training_start", { payload }),
  trainingStop: (id: string) =>
    call<TrainingJob>("training_stop", { payload: { id } }),
  trainingList: () => call<TrainingJob[]>("training_list"),
  trainingSync: () => call<TrainingJob[]>("training_sync"),
  trainingExportOnnx: (jobId: string) =>
    call<ExportResult>("training_export_onnx", { payload: { id: jobId } }),
  trainingLogs: (jobId: string, offset = 0) =>
    call<TrainingLogChunk>("training_logs", { payload: { jobId, offset } }),
  trainingReport: (jobId: string) =>
    call<TrainingReport>("training_report", { payload: { id: jobId } }),

  exportOnnx: (payload: ExportRequest) =>
    call<ExportResult>("export_onnx", { payload }),
  exportTensorrt: (payload: ExportRequest) =>
    call<ExportResult>("export_tensorrt", { payload }),
  exportOpenvino: (payload: ExportRequest) =>
    call<ExportResult>("export_openvino", { payload }),
}

export type StudioCommands = typeof studioCommands

