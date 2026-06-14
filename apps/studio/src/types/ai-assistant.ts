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
  os: string
  arch: string
  logicalCores: number
  executionProviders: AiExecutionProvider[]
  recommendedProvider: string
  gpuAccelerationAvailable: boolean
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
