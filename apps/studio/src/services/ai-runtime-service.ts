import { studioCommands } from "@/ipc/studio"
import type {
  ExportRequest,
  TrainingStartRequest,
} from "@/types/ai-runtime"

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

  listModels: () => studioCommands.runtimeModelsList(),
  installModel: (id: string) => studioCommands.runtimeModelsInstall(id),
  deleteModel: (id: string) => studioCommands.runtimeModelsDelete(id),

  startTraining: (payload: TrainingStartRequest) =>
    studioCommands.trainingStart(payload),
  stopTraining: (id: string) => studioCommands.trainingStop(id),
  listTraining: () => studioCommands.trainingList(),
  trainingLogs: (jobId: string, offset = 0) =>
    studioCommands.trainingLogs(jobId, offset),

  exportOnnx: (payload: ExportRequest) => studioCommands.exportOnnx(payload),
  exportTensorrt: (payload: ExportRequest) =>
    studioCommands.exportTensorrt(payload),
  exportOpenvino: (payload: ExportRequest) =>
    studioCommands.exportOpenvino(payload),
}
