// Types for the local AI assistant's model/capability registry, mirroring
// `src-tauri/crates/models/src/domain/registry.rs`. (GPU detection + the ONNX
// Runtime installer were removed — AI now runs in the embedded Python runtime;
// see `@/shared/types/ai-runtime`.)

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
  | {
      kind: "createLabel"
      name: string
      color: string
      projectId: string
      message: string
    }

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
  itemId: string
  message: string
  /** Tool ids the user has enabled (Tools menu). Omitted/empty = all tools on.
   *  A disabled tool is never run, even if the message asks for it. */
  enabledTools?: string[]
}

// The shape sent back to apply an approved action. Mirrors the Rust
// `CopilotActionPayload` (tagged by `kind`).
export type CopilotApplyAction =
  | { kind: "relabel"; annotationId: string; toLabel: string }
  | { kind: "delete"; annotationId: string }
  | { kind: "createLabel"; name: string; color?: string; projectId: string }

// How the copilot should treat image input for a manually configured model.
export type CopilotVisionPref = "auto" | "on" | "off"

// The user's saved copilot LLM/VLM server config (Settings → AI Copilot). Stored
// as plain `copilot.*` settings; the API key lives in the keychain, not here.
// When `baseUrl` is empty the backend auto-discovers a local server instead.
export interface CopilotConfig {
  /** UI hint for the chosen preset: "auto" | "lmstudio" | "ollama" | … */
  provider: string
  /** Server base URL, e.g. http://localhost:1234/v1. Empty = auto-detect. */
  baseUrl: string
  /** Pinned model id; empty = let the server's loaded model be picked. */
  model: string
  vision: CopilotVisionPref
}

// Result of probing a manual copilot server. Mirrors the Rust `CopilotTestResult`.
export interface CopilotTestResult {
  ok: boolean
  message: string
  models: string[]
}
