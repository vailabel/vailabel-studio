//! Routes a training run to where it should train: the embedded runtime on
//! this computer, or a registered training agent.
//!
//! Both are the same `TrainingRuntime` port to the training module, so nothing
//! above this file knows remote training exists. The run's `config._studio`
//! metadata (see [`super::agents::RunMeta`]) carries the choice.

use std::path::{Path, PathBuf};
use std::sync::Arc;

use async_trait::async_trait;
use serde_json::Value;
use vailabel_agent_client::{archive, AgentClient, CreateJobRequest};
use vailabel_core::{DomainError, DomainResult};
use vailabel_training::application::{TrainingRuntime, TrainingStartReq};
use vailabel_training::domain::TrainingRepository;

use super::agents::{trainer_config, AgentResolver, RunMeta};

fn domain_error(error: impl std::fmt::Display) -> DomainError {
    DomainError::repository(error.to_string())
}

pub struct RoutingTrainingRuntime {
    local: Arc<dyn TrainingRuntime>,
    agents: Arc<dyn AgentResolver>,
    /// Used by `stop`, which only gets a job id, to find where the run trains.
    runs: Arc<dyn TrainingRepository>,
}

impl RoutingTrainingRuntime {
    pub fn new(
        local: Arc<dyn TrainingRuntime>,
        agents: Arc<dyn AgentResolver>,
        runs: Arc<dyn TrainingRepository>,
    ) -> Self {
        Self {
            local,
            agents,
            runs,
        }
    }
}

/// Removes the temporary dataset archive however the upload ends.
struct TempFile(PathBuf);

impl Drop for TempFile {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.0);
    }
}

/// Ship a run to an agent: register it, upload the dataset (and the weights to
/// fine-tune from, if any), then queue it.
async fn start_on_agent(client: &AgentClient, req: TrainingStartReq) -> DomainResult<()> {
    let yaml = PathBuf::from(&req.dataset_path);
    let dataset_dir = yaml
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| domain_error("The dataset path has no parent folder."))?;
    let entry = yaml
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| domain_error("The dataset path has no file name."))?
        .to_string();

    // The base weights are a path on THIS machine; the agent gets the file
    // itself and points the trainer at its own copy.
    let mut config = trainer_config(&req.config);
    let base_weights = config
        .get("weights")
        .and_then(Value::as_str)
        .map(PathBuf::from)
        .filter(|path| path.is_file());
    if base_weights.is_some() {
        if let Some(map) = config.as_object_mut() {
            map.remove("weights");
        }
    }

    client
        .create_job(&CreateJobRequest {
            job_id: req.job_id.clone(),
            project_id: req.project_id.clone(),
            model_family: req.model_family.clone(),
            name: None,
            config,
        })
        .await
        .map_err(domain_error)?;

    let upload = async {
        let tar =
            TempFile(std::env::temp_dir().join(format!("vailabel-dataset-{}.tar", req.job_id)));
        let tar_path = tar.0.clone();
        tokio::task::spawn_blocking(move || archive::pack_dir(&dataset_dir, &tar_path))
            .await
            .map_err(domain_error)?
            .map_err(domain_error)?;
        client
            .upload_dataset(&req.job_id, &tar.0, &entry)
            .await
            .map_err(domain_error)?;
        if let Some(weights) = &base_weights {
            client
                .upload_weights(&req.job_id, weights)
                .await
                .map_err(domain_error)?;
        }
        client.start_job(&req.job_id).await.map_err(domain_error)?;
        Ok::<(), DomainError>(())
    };

    let outcome = upload.await;
    if outcome.is_err() {
        // Don't leave a half-uploaded job (and its dataset) on the agent.
        let _ = client.delete_job(&req.job_id).await;
    }
    outcome
}

#[async_trait]
impl TrainingRuntime for RoutingTrainingRuntime {
    async fn start(&self, mut req: TrainingStartReq) -> DomainResult<()> {
        match RunMeta::of(&req.config).agent_id {
            Some(agent_id) => {
                let client = self.agents.client_for(&agent_id).map_err(domain_error)?;
                start_on_agent(&client, req).await
            }
            None => {
                req.config = trainer_config(&req.config);
                self.local.start(req).await
            }
        }
    }

    async fn stop(&self, job_id: &str) -> DomainResult<()> {
        let agent_id = self
            .runs
            .get(job_id)?
            .and_then(|run| RunMeta::of(&run.config).agent_id);
        match agent_id {
            Some(agent_id) => {
                let client = self.agents.client_for(&agent_id).map_err(domain_error)?;
                client
                    .stop_job(job_id)
                    .await
                    .map(|_| ())
                    .map_err(domain_error)
            }
            None => self.local.stop(job_id).await,
        }
    }
}
