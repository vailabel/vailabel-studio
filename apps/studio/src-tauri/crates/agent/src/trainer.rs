//! The port to whatever actually trains a model.
//!
//! In production this is the same Python runtime the desktop app embeds, run
//! through `runtime-manager`. Keeping it behind a trait lets the job engine and
//! the HTTP API be tested without Python.

use std::sync::Arc;

use async_trait::async_trait;
use runtime_manager::{JobIdRequest, RuntimeService, TrainingStartRequest};
use serde_json::Value;

/// Everything the trainer needs to run one job.
#[derive(Debug, Clone)]
pub struct TrainSpec {
    pub job_id: String,
    pub project_id: String,
    pub model_family: String,
    /// Absolute path of the dataset file to train on (`data.yaml`).
    pub dataset_path: String,
    pub config: Value,
    /// Where to write log lines; training output goes in a sibling directory
    /// named after the job.
    pub log_path: String,
}

/// A live view of one job, as the trainer reports it.
#[derive(Debug, Clone)]
pub struct Snapshot {
    pub job_id: String,
    pub status: String,
    pub progress: f32,
    pub metrics: Value,
    pub error: Option<String>,
}

#[async_trait]
pub trait Trainer: Send + Sync {
    async fn start(&self, spec: TrainSpec) -> Result<(), String>;
    /// Best-effort cancel.
    async fn stop(&self, job_id: &str) -> Result<(), String>;
    /// Snapshots of every job the trainer currently knows. `Err` means the
    /// trainer can't be asked right now (not running / restarting).
    async fn snapshots(&self) -> Result<Vec<Snapshot>, String>;
    /// Human-readable state for the agent info endpoint.
    fn state(&self) -> String;
    /// Name of the GPU the trainer will use, when one is visible.
    async fn gpu(&self) -> Option<String>;
    async fn shutdown(&self);
}

/// [`Trainer`] backed by the embedded Python runtime.
pub struct RuntimeTrainer {
    runtime: Arc<RuntimeService>,
}

impl RuntimeTrainer {
    pub fn new(runtime: Arc<RuntimeService>) -> Self {
        Self { runtime }
    }
}

#[async_trait]
impl Trainer for RuntimeTrainer {
    async fn start(&self, spec: TrainSpec) -> Result<(), String> {
        let client = self
            .runtime
            .ensure_started()
            .await
            .map_err(|e| format!("The training runtime could not start: {e}"))?;
        client
            .training_start(&TrainingStartRequest {
                job_id: spec.job_id,
                project_id: spec.project_id,
                model_family: spec.model_family,
                dataset_path: spec.dataset_path,
                config: spec.config,
                log_path: spec.log_path,
            })
            .await
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    async fn stop(&self, job_id: &str) -> Result<(), String> {
        let Some(client) = self.runtime.try_client() else {
            return Ok(());
        };
        client
            .training_stop(&JobIdRequest {
                job_id: job_id.to_string(),
            })
            .await
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    async fn snapshots(&self) -> Result<Vec<Snapshot>, String> {
        let client = self
            .runtime
            .try_client()
            .ok_or_else(|| "the training runtime is not running".to_string())?;
        let jobs = client.training_jobs().await.map_err(|e| e.to_string())?;
        Ok(jobs
            .into_iter()
            .map(|job| Snapshot {
                job_id: job.job_id,
                status: job.status,
                progress: job.progress,
                metrics: job.metrics,
                error: job.error,
            })
            .collect())
    }

    fn state(&self) -> String {
        format!("{:?}", self.runtime.state()).to_lowercase()
    }

    async fn gpu(&self) -> Option<String> {
        let info = self.runtime.try_client()?.gpu_info().await.ok()?;
        info.available.then_some(info.name).flatten()
    }

    async fn shutdown(&self) {
        let _ = self.runtime.stop().await;
    }
}
