//! The `TrainingRun` aggregate.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use vailabel_core::{AggregateRoot, Entity, Identifiable};

use super::status::TrainingStatus;

/// A training run (the spec's TrainingRun aggregate). Serde shape is camelCase,
/// matching the frontend `TrainingJob` type and the columns of the existing
/// `training_jobs` table (`config`/`metrics` are the parsed JSON blobs).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrainingRun {
    pub id: String,
    pub project_id: String,
    pub model_id: Option<String>,
    pub name: String,
    #[serde(default)]
    pub status: TrainingStatus,
    #[serde(default)]
    pub config: Value,
    #[serde(default)]
    pub metrics: Value,
    #[serde(default)]
    pub progress: f32,
    pub log_path: Option<String>,
    pub error: Option<String>,
    #[serde(default = "vailabel_shared::now_iso")]
    pub created_at: String,
    #[serde(default = "vailabel_shared::now_iso")]
    pub updated_at: String,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
}

impl Identifiable for TrainingRun {
    fn id(&self) -> &str {
        &self.id
    }
}

impl Entity for TrainingRun {}
impl AggregateRoot for TrainingRun {}
