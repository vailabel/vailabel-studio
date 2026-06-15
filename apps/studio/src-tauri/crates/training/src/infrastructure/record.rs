//! The persistence record for `TrainingRun` and its mapping to/from the domain.

use diesel::prelude::*;
use serde_json::Value;

use super::schema::training_jobs;
use crate::domain::{TrainingRun, TrainingStatus};

/// The `training_jobs` table row. Mirrors the residual store's `TrainingJobRow`;
/// `config`/`metrics` are stored as JSON-string blobs.
#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = training_jobs)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct TrainingRunRow {
    pub id: String,
    pub project_id: String,
    pub model_id: Option<String>,
    pub name: String,
    pub status: String,
    pub config_json: Option<String>,
    pub metrics_json: Option<String>,
    pub progress: f32,
    pub log_path: Option<String>,
    pub error: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
}

impl TrainingRunRow {
    /// Build a row for insert/update. Mirrors the residual store's
    /// `training_job_row_from`: `config`/`metrics` JSON-stringified (None when
    /// null), `status` defaults to `pending` when empty, `updated_at` refreshed,
    /// `created_at` preserved (or `now`).
    pub fn from_run(run: &TrainingRun, now: &str) -> Self {
        Self {
            id: run.id.clone(),
            project_id: run.project_id.clone(),
            model_id: run.model_id.clone(),
            name: run.name.clone(),
            status: if run.status.as_str().is_empty() {
                "pending".to_string()
            } else {
                run.status.as_str().to_string()
            },
            config_json: json_to_string(&run.config),
            metrics_json: json_to_string(&run.metrics),
            progress: run.progress,
            log_path: run.log_path.clone(),
            error: run.error.clone(),
            created_at: if run.created_at.is_empty() {
                now.to_string()
            } else {
                run.created_at.clone()
            },
            updated_at: now.to_string(),
            started_at: run.started_at.clone(),
            finished_at: run.finished_at.clone(),
        }
    }

    /// Convert a stored row back into the domain `TrainingRun`.
    pub fn into_run(self) -> TrainingRun {
        TrainingRun {
            id: self.id,
            project_id: self.project_id,
            model_id: self.model_id,
            name: self.name,
            status: TrainingStatus::new(self.status),
            config: parse_json(self.config_json.as_deref()),
            metrics: parse_json(self.metrics_json.as_deref()),
            progress: self.progress,
            log_path: self.log_path,
            error: self.error,
            created_at: self.created_at,
            updated_at: self.updated_at,
            started_at: self.started_at,
            finished_at: self.finished_at,
        }
    }
}

fn json_to_string(value: &Value) -> Option<String> {
    if value.is_null() {
        None
    } else {
        Some(value.to_string())
    }
}

fn parse_json(s: Option<&str>) -> Value {
    s.and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or(Value::Null)
}
