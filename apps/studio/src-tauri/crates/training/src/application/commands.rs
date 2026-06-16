//! Training write-side commands.

use serde_json::Value;

/// Start a training run. The composition root supplies the `job_id` (it embeds
/// it in the `{job_id}.log` path it creates) and `log_path`/`config`; the
/// application service resolves the default name, persists the pending run, and
/// drives the runtime.
pub struct StartTrainingCommand {
    pub job_id: String,
    pub project_id: String,
    pub model_id: Option<String>,
    pub model_family: String,
    pub dataset_path: String,
    pub name: Option<String>,
    pub config: Value,
    pub log_path: String,
}

/// Stop (cancel) a training run by id.
pub struct StopTrainingCommand {
    pub id: String,
}

impl StopTrainingCommand {
    pub fn new(id: impl Into<String>) -> Self {
        Self { id: id.into() }
    }
}

/// A live status snapshot pulled from the runtime, used to reconcile a run that
/// the runtime owns the progress of. The composition root maps the runtime's
/// `TrainingJobStatus` wire shape onto this; the application stays HTTP-unaware.
pub struct SyncTrainingUpdate {
    pub job_id: String,
    pub status: String,
    pub progress: f32,
    pub metrics: Value,
    pub error: Option<String>,
}
