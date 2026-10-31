//! Request/response shapes of the agent's HTTP API (all under [`API_PREFIX`]).
//! JSON is camelCase, matching the rest of Studio's IPC.

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const API_PREFIX: &str = "/v1";
/// Default port the agent listens on.
pub const DEFAULT_PORT: u16 = 8765;

/// Job statuses. The last five are the training runtime's own vocabulary (and
/// what Studio stores); `created` and `queued` exist only on the agent.
pub mod status {
    /// Registered; waiting for its dataset upload and a start request.
    pub const CREATED: &str = "created";
    /// Ready to train, waiting for a free slot.
    pub const QUEUED: &str = "queued";
    pub const PENDING: &str = "pending";
    pub const RUNNING: &str = "running";
    pub const COMPLETED: &str = "completed";
    pub const FAILED: &str = "failed";
    pub const CANCELED: &str = "canceled";

    /// Whether a job in this status can still make progress.
    pub fn is_in_flight(status: &str) -> bool {
        matches!(status, CREATED | QUEUED | PENDING | RUNNING)
    }

    /// The status Studio should record for an agent-side status: the agent's
    /// waiting states are all "pending" from the user's point of view.
    pub fn for_studio(status: &str) -> &str {
        match status {
            CREATED | QUEUED => PENDING,
            other => other,
        }
    }
}

/// `GET /v1/agent` — who the agent is and what it is doing.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentInfo {
    pub name: String,
    pub version: String,
    pub os: String,
    pub arch: String,
    /// State of the Python training runtime ("stopped", "healthy", …).
    pub runtime: String,
    /// GPU name when the runtime is up and can see one.
    #[serde(default)]
    pub gpu: Option<String>,
    pub running_jobs: u32,
    pub queued_jobs: u32,
    pub max_concurrent: u32,
}

/// `POST /v1/jobs` — register a job before uploading its dataset.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateJobRequest {
    /// Studio's training-run id, reused so both sides talk about one job.
    pub job_id: String,
    pub project_id: String,
    /// Trainer family: "yolo" or "rtdetr".
    pub model_family: String,
    #[serde(default)]
    pub name: Option<String>,
    /// Trainer options (epochs, imgsz, batch, …), forwarded to the trainer.
    #[serde(default)]
    pub config: Value,
}

/// A job as the agent reports it.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobView {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub model_family: String,
    pub status: String,
    /// 0.0 – 1.0.
    #[serde(default)]
    pub progress: f32,
    #[serde(default)]
    pub metrics: Value,
    #[serde(default)]
    pub error: Option<String>,
    pub has_dataset: bool,
    /// True when base weights were uploaded (the run fine-tunes from them).
    pub has_base_weights: bool,
    /// True once trained weights exist and can be downloaded.
    pub has_weights: bool,
    pub created_at: String,
    #[serde(default)]
    pub started_at: Option<String>,
    #[serde(default)]
    pub finished_at: Option<String>,
}

/// `GET /v1/jobs/{id}/logs?offset=` — an incremental slice of the job log.
/// Field names match the embedded runtime's log chunk, which the UI already reads.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LogChunk {
    #[serde(default)]
    pub lines: Vec<String>,
    /// Byte offset to pass on the next poll.
    #[serde(default)]
    pub next_offset: u64,
    #[serde(default)]
    pub eof: bool,
}

/// Body of every non-2xx response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorBody {
    pub error: String,
}
