// Types for the Phase 1 local AI assistant (GPU detection + model registry).
// Mirrors the Rust shapes from `src-tauri/src/gpu.rs` and
// `src-tauri/src/domain/ai/registry.rs`.

export interface AiExecutionProvider {
  name: string
  kind: "gpu" | "cpu"
  compiledIn: boolean
  note: string
}

export interface AiGpuInfo {
  onnxRuntime: boolean
  /** Compiled-in: the CUDA execution provider is built into this binary. */
  cudaCompiled?: boolean
  /** Runtime: the ONNX Runtime dynamic library actually loaded. */
  onnxRuntimeLoaded?: boolean
  /** Runtime: the CUDA provider is usable on this host right now. */
  cudaAvailable?: boolean
  /** Why the runtime failed to load, when it did. */
  loadError?: string | null
  os: string
  arch: string
  logicalCores: number
  executionProviders: AiExecutionProvider[]
  recommendedProvider: string
  gpuAccelerationAvailable: boolean
}

// --- ONNX Runtime auto-installer (downloads onnxruntime.dll + cuDNN on demand) ---

export interface RuntimeInstallStatus {
  installed: boolean
  cudnnInstalled?: boolean
  cudaProviderInstalled?: boolean
  dllPath?: string | null
  installDir?: string | null
  version?: string
  /** Auto-install is currently Windows-only. */
  supported?: boolean
}

export interface RuntimeInstallResult {
  installed: boolean
  /** True when nothing had to be downloaded — it was already on disk. */
  alreadyPresent: boolean
  gpuRequested: boolean
  cudnnInstalled: boolean
  /** Components fetched this run, e.g. ["onnxruntime", "cudnn"]. */
  installedComponents: string[]
  /** Components already present and therefore skipped. */
  skippedComponents: string[]
  dllPath: string
  installDir: string
  version: string
  /** Non-fatal issues, e.g. cuDNN couldn't be fetched (CPU still works). */
  warnings: string[]
  restartRequired: boolean
}

export interface RuntimeInstallProgress {
  /** "onnxruntime" | "cudnn" | "extract" | "done" */
  phase: string
  message: string
  receivedBytes: number
  totalBytes?: number | null
}

export type AiModelTask =
  | "detection"
  | "segmentation"
  | "prompt_detection"
  | "embedding"
  | "captioning"

export type AiCapability =
  | "click_to_segment"
  | "prompt_to_detect"
  | "auto_polygon"
  | "auto_bounding_box"
  | "batch_auto_labeling"

export type AiModelStatus = "available" | "planned"

export interface AiRegistryModel {
  id: string
  name: string
  family: string
  task: AiModelTask
  capabilities: AiCapability[]
  description: string
  params: string
  onnxComponents: string[]
  needsTokenizer: boolean
  source: string
  status: AiModelStatus
}

// Display metadata for the five Phase 1 capabilities (the "Features" list).
export const CAPABILITY_LABELS: Record<AiCapability, string> = {
  click_to_segment: "Click To Segment",
  prompt_to_detect: "Prompt To Detect",
  auto_polygon: "Auto Polygon Generation",
  auto_bounding_box: "Auto Bounding Box",
  batch_auto_labeling: "Batch Auto Labeling",
}

export const TASK_LABELS: Record<AiModelTask, string> = {
  detection: "Detection",
  segmentation: "Segmentation",
  prompt_detection: "Prompt Detection",
  embedding: "Embedding",
  captioning: "Vision-Language",
}

// --- Local AI copilot (chat assistant over the local detector) ---

export interface CopilotFinding {
  kind: "missed" | "mislabel" | "duplicate"
  message: string
  annotationId?: string
}

export type CopilotProposedAction =
  | { kind: "relabel"; annotationId: string; toLabel: string; message: string }
  | { kind: "delete"; annotationId: string; message: string }

export interface CopilotTurnResult {
  reply: string
  capability: string
  predictionsAdded: number
  findings: CopilotFinding[]
  proposedActions: CopilotProposedAction[]
}

// The copilot auto-discovers a local OpenAI-compatible LLM/VLM (LM Studio,
// Ollama, llama.cpp) and picks the model itself — there is no client-side model
// configuration. Everything stays on the user's machine.
export interface CopilotTurnRequest {
  projectId?: string
  imageId: string
  message: string
}

// The shape sent back to apply an approved action. Mirrors the Rust
// `CopilotActionPayload` (tagged by `kind`).
export type CopilotApplyAction =
  | { kind: "relabel"; annotationId: string; toLabel: string }
  | { kind: "delete"; annotationId: string }
  | { kind: "createLabel"; name: string; color?: string; projectId: string }
