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

/** Return shape of the `runtime_system_info` command. `system`/`gpu` are passed
 *  straight through from the Python runtime's `/system` + `/gpu` endpoints, so
 *  their keys are snake_case (unlike `status`, which is the camelCase
 *  `RuntimeStatus`). */
export interface RuntimeSystemInfo {
  running: boolean
  status: RuntimeStatus
  system?: {
    python_version?: string
    torch_version?: string
    platform?: string
    cpu_count?: number
  } | null
  gpu?: {
    available?: boolean
    name?: string | null
    vram_used_mb?: number | null
    vram_total_mb?: number | null
    cuda_version?: string | null
  } | null
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

/** Annotation import format. `"auto"` detects from the folder contents. */
export type DatasetImportFormat = "auto" | "yolo" | "coco"

export interface DatasetImportRequest {
  projectId: string
  /** Root folder of an unzipped dataset export (YOLO or COCO). */
  folder: string
  /** Force a format, or `"auto"` (default) to detect it. */
  format?: DatasetImportFormat
}

/** Summary of a dataset imported into a project. */
export interface DatasetImportResult {
  itemCount: number
  annotationCount: number
  classCount: number
  createdClassCount: number
  classNames: string[]
  skippedImageCount: number
  warnings: string[]
  /** Which importer ran: "yolo" or "coco". */
  format: string
}

/** Summary of a YOLO dataset materialized from a project's annotations. */
export interface DatasetExportResult {
  /** The `data.yaml` path — feed this to `TrainingStartRequest.datasetPath`. */
  datasetPath: string
  root: string
  itemCount: number
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

/** Result of `runtime_gpu_probe` — an `nvidia-smi`-based GPU detection that works
 *  even while the runtime's torch is CPU-only, so the UI can offer one-click GPU
 *  acceleration. */
export interface GpuProbe {
  detected: boolean
  name?: string
  driverVersion?: string
  cudaVersion?: string | null
  /** PyTorch CUDA wheel channel matched to the driver, e.g. "cu128". */
  recommendedTag?: string
  /** A CUDA torch overlay is already on disk (may need an app restart). */
  overlayInstalled?: boolean
  /** Host OS from the Rust runtime: "windows" | "macos" | "linux". CUDA install
   *  is offered on Windows/Linux only; macOS uses Metal/MPS automatically. */
  platform?: string
}

/** Result of `runtime_install_status`. The embedded Python interpreter is
 *  provisioned on first run (downloaded into app-data), not bundled in the
 *  installer — so it may not be present yet. */
export interface RuntimeInstallStatus {
  installed: boolean
  /** Coarse download+install size estimate (MB), shown in the install prompt. */
  sizeEstimateMb: number
  pythonDir: string
}
