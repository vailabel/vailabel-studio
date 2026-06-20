/**
 * Frontend mirror of the Rust `ActivityEvent` carried on the unified
 * `studio://activity` channel — one stream for every long-running backend task
 * (downloads, installs, video ingest, dataset analysis, training, cloud sync).
 * The {@link ActivityProvider} keys tasks by `id` and replaces on each snapshot;
 * feature viewmodels can filter by {@link Activity.kind} and read the rich job
 * off {@link Activity.data}.
 */

/** Lifecycle of a backend task. */
export type ActivityPhase = "active" | "done" | "error"

/** Category of backend work — drives the indicator's icon/label and lets
 *  feature viewmodels subscribe to just their own kind. */
export type ActivityKind =
  | "runtime-install"
  | "gpu-install"
  | "model-download"
  | "cloud-sync"
  | "video-ingest"
  | "analysis"
  | "training"
  | (string & {})

/** A snapshot of one backend task. `TData` is the optional feature-specific
 *  payload (e.g. a `VideoJob` / `AnalysisJob`) carried on {@link Activity.data}. */
export interface Activity<TData = unknown> {
  /** Stable id — re-emitting with the same id updates this task in place. */
  id: string
  kind: ActivityKind
  /** Human-readable headline. */
  title: string
  phase: ActivityPhase
  /** Detail line — the current stage or latest message. */
  message: string
  /** Determinate progress 0–100, or null while indeterminate. */
  percent: number | null
  /** Raw counter (bytes or items completed). */
  current?: number | null
  /** Raw total (bytes or items). */
  total?: number | null
  /** What `current`/`total` count. */
  unit?: "bytes" | "items" | null
  /** Optional feature-specific payload (e.g. the rich job record). */
  data?: TData
  occurredAt: string
}
