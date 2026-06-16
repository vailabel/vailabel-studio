import { studioCommands } from "@/shared/ipc/studio"

// Service layer for the Phase 1 local AI assistant. Thin wrapper over the IPC
// surface so viewmodels/components don't call Tauri commands directly.
export const aiAssistantService = {
  getGpuInfo: () => studioCommands.aiGpuInfo(),
  getModelRegistry: () => studioCommands.aiModelRegistry(),
  // ONNX Runtime auto-installer.
  getRuntimeStatus: () => studioCommands.aiRuntimeStatus(),
  installRuntime: (gpu = true) => studioCommands.aiRuntimeInstall(gpu),
  restartForRuntime: () => studioCommands.aiRuntimeRestart(),
}
