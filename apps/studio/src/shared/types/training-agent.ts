// A training agent: the `vailabel-agent` service installed on another machine
// (usually a GPU server) that Studio sends training runs to. Mirrors the Rust
// types in `src-tauri/crates/agent-client` and `features/training/agents.rs`.

/** A registered agent. The access token is NOT here — it lives in the keychain. */
export interface TrainingAgent {
  id: string
  name: string
  /** e.g. `http://gpu-box:8765` */
  url: string
}

/** What an agent reports about itself (the "test connection" answer). */
export interface TrainingAgentInfo {
  name: string
  version: string
  os: string
  arch: string
  /** State of the agent's Python trainer: "stopped" until its first job. */
  runtime: string
  gpu?: string | null
  runningJobs: number
  queuedJobs: number
  maxConcurrent: number
}

/** Either a saved agent, or an address + token still being typed. */
export type TrainingAgentTestRequest =
  { agentId: string } | { url: string; token: string }

/**
 * Studio's own bookkeeping on a training run, stored at `config._studio`.
 * Everything else in `config` is passed to the trainer as-is, so anything that
 * is not a trainer option must go here.
 */
export interface TrainingRunMeta {
  /** The agent the run trains on; absent = this computer. */
  agentId?: string
  /** "last" = fine-tune from the project's most recent trained model. */
  continueFrom?: "last"
  /** The run this one started from (filled in by the backend). */
  baseRunId?: string
  modelFamily?: string
  labeledItems?: number
  /** True when automatic retraining started the run. */
  auto?: boolean
}

export const RUN_META_KEY = "_studio"

/** Read a run's bookkeeping; tolerant of runs created before it existed. */
export function runMetaOf(config: unknown): TrainingRunMeta {
  const meta = (config as Record<string, unknown> | null | undefined)?.[
    RUN_META_KEY
  ]
  return meta && typeof meta === "object" ? (meta as TrainingRunMeta) : {}
}
