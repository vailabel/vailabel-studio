// Mirrors the Rust `runtime-manager` types and the `domain/runtime` command
// surface for the embedded Python/FastAPI AI runtime.

export type RuntimeState =
  | "stopped"
  | "starting"
  | "healthy"
  | "unhealthy"
  | "restarting"
  | "crashed"

export interface RuntimeMetrics {
  cpu: number
  ramMb: number
  gpuUtil?: number | null
  vramUsedMb?: number | null
  vramTotalMb?: number | null
}

export interface RuntimeStatus {
  state: RuntimeState
  port?: number | null
  pid?: number | null
  version?: string | null
  uptimeS?: number | null
  lastError?: string | null
  restartCount: number
  metrics?: RuntimeMetrics | null
}

/** Payload of the `runtime://status` event. */
export interface RuntimeStatusEvent {
  state: RuntimeState
  lastError?: string | null
  restartedFromCrash: boolean
  giveUp: boolean
  port?: number | null
  pid?: number | null
}

export type TrainingJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "canceled"

export interface TrainingJob {
  id: string
  projectId: string
  modelId?: string | null
  name: string
  status: TrainingJobStatus
  config?: unknown
  metrics?: unknown
  progress: number
  logPath?: string | null
  error?: string | null
  createdAt?: string
  updatedAt?: string
  startedAt?: string | null
  finishedAt?: string | null
}

export type RuntimeModelStatus =
  | "available"
  | "downloading"
  | "installed"
  | "error"

export interface RuntimeModel {
  id: string
  name: string
  family: string
  version: string
  size: number
  downloadUrl?: string | null
  localPath?: string | null
  sha256?: string | null
  status: RuntimeModelStatus
  capabilities?: string[]
  installedAt?: string | null
}

export interface TrainingStartRequest {
  projectId: string
  modelFamily: string
  datasetPath: string
  modelId?: string
  name?: string
  config?: unknown
}

export interface DatasetExportRequest {
  projectId: string
  valSplit?: number
}

export interface DatasetImportRequest {
  projectId: string
  /** Root folder of an unzipped YOLO/Roboflow export. */
  folder: string
}

/** Summary of a YOLO/Roboflow dataset imported into a project. */
export interface DatasetImportResult {
  imageCount: number
  annotationCount: number
  classCount: number
  createdClassCount: number
  classNames: string[]
  skippedImageCount: number
  warnings: string[]
}

/** Summary of a YOLO dataset materialized from a project's annotations. */
export interface DatasetExportResult {
  /** The `data.yaml` path — feed this to `TrainingStartRequest.datasetPath`. */
  datasetPath: string
  root: string
  imageCount: number
  trainCount: number
  valCount: number
  labeledCount: number
  annotationCount: number
  classCount: number
  classNames: string[]
  warnings: string[]
}

export interface TrainingLogChunk {
  lines: string[]
  next_offset: number
  eof: boolean
}

export interface TrainingReportPlot {
  label: string
  /** Absolute path to a plot image; render via toAssetUrl(). */
  path: string
}

export interface TrainingReport {
  jobId: string
  name: string
  saveDir: string
  epochs: number
  /** Final-epoch row of ultralytics' results.csv, keyed by column name
   * (e.g. "metrics/mAP50(B)"). Non-numeric cells come back as null. */
  final: Record<string, number | null>
  plots: TrainingReportPlot[]
}

export interface ExportRequest {
  modelPath: string
  outputPath: string
  opts?: unknown
}

export interface ExportResult {
  ok: boolean
  output_path: string
  error?: string | null
}

/** Payload of the `runtime-models-install://progress` event. */
export interface RuntimeModelInstallProgress {
  phase: "start" | "downloading" | "done" | "error"
  message: string
  receivedBytes: number
  totalBytes: number
}
