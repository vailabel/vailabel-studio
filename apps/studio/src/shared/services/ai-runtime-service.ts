import { studioCommands } from "@/shared/ipc/studio"
import type {
  DatasetExportRequest,
  ExportRequest,
  TrainingStartRequest,
} from "@/shared/types/ai-runtime"

// Thin wrapper over the embedded-runtime IPC surface so viewmodels never call
// Tauri commands directly. The runtime is an internal Python/FastAPI service —
// only Rust talks to it; the frontend goes through these commands.
export const aiRuntimeService = {
  start: () => studioCommands.runtimeStart(),
  stop: () => studioCommands.runtimeStop(),
  restart: () => studioCommands.runtimeRestart(),
  status: () => studioCommands.runtimeStatus(),
  logs: () => studioCommands.runtimeLogs(),
  systemInfo: () => studioCommands.runtimeSystemInfo(),

  // First-run provisioning (download CPython + deps into app-data).
  installStatus: () => studioCommands.runtimeInstallStatus(),
  install: () => studioCommands.runtimeInstall(),

  listModels: () => studioCommands.runtimeModelsList(),
  installModel: (id: string) => studioCommands.runtimeModelsInstall(id),
  deleteModel: (id: string) => studioCommands.runtimeModelsDelete(id),

  // GPU acceleration.
  gpuProbe: () => studioCommands.runtimeGpuProbe(),
  enableGpu: (tag?: string) => studioCommands.runtimeEnableGpu(tag),
  restartApp: () => studioCommands.appRestart(),

  exportDataset: (payload: DatasetExportRequest) =>
    studioCommands.datasetExportYolo(payload),

  startTraining: (payload: TrainingStartRequest) =>
    studioCommands.trainingStart(payload),
  stopTraining: (id: string) => studioCommands.trainingStop(id),
  listTraining: () => studioCommands.trainingList(),
  syncTraining: () => studioCommands.trainingSync(),
  exportTrainedModel: (jobId: string) =>
    studioCommands.trainingExportOnnx(jobId),
  trainingLogs: (jobId: string, offset = 0) =>
    studioCommands.trainingLogs(jobId, offset),
  trainingReport: (jobId: string) => studioCommands.trainingReport(jobId),

  exportOnnx: (payload: ExportRequest) => studioCommands.exportOnnx(payload),
  exportTensorrt: (payload: ExportRequest) =>
    studioCommands.exportTensorrt(payload),
  exportOpenvino: (payload: ExportRequest) =>
    studioCommands.exportOpenvino(payload),
}
