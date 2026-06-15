//! Training write-side commands.

use serde_json::Value;

/// Start a training run. The composition root supplies `log_path` (it owns the
/// filesystem) and `config`; the application service mints the job id and the
/// default name, persists the pending run, and drives the runtime.
pub struct StartTrainingCommand {
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
