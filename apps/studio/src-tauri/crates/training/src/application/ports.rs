//! The training runtime port.

use async_trait::async_trait;
use serde_json::Value;
use vailabel_core::DomainResult;

/// What the application service needs to ask the embedded runtime to start a job.
pub struct TrainingStartReq {
    pub job_id: String,
    pub project_id: String,
    pub model_family: String,
    pub dataset_path: String,
    pub config: Value,
    pub log_path: String,
}

/// Port to the training runtime (the Python/FastAPI ACL). It is async because
/// the runtime client is async; the composition root implements it over
/// `RuntimeService`. The domain/application stays unaware of HTTP.
#[async_trait]
pub trait TrainingRuntime: Send + Sync {
    /// Begin training. `Err` means the runtime rejected or failed to start it.
    async fn start(&self, req: TrainingStartReq) -> DomainResult<()>;

    /// Best-effort stop of a running job.
    async fn stop(&self, job_id: &str) -> DomainResult<()>;
}
