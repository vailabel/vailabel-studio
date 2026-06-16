//! Composition-root impl of the training module's `TrainingRuntime` port.
//!
//! Binds the pure `vailabel_training::application::TrainingRuntime` port to the
//! embedded Python/FastAPI runtime via `runtime-manager` (the ACL). This is the
//! only place that knows both the training module and the runtime client.

use std::sync::Arc;

use async_trait::async_trait;
use vailabel_core::{DomainError, DomainResult};
use vailabel_training::application::{TrainingRuntime, TrainingStartReq};

use runtime_manager::{JobIdRequest, RuntimeService, TrainingStartRequest};

/// `TrainingRuntime` backed by the embedded runtime service.
pub struct BinaryTrainingRuntime {
    runtime: Arc<RuntimeService>,
}

impl BinaryTrainingRuntime {
    pub fn new(runtime: Arc<RuntimeService>) -> Self {
        Self { runtime }
    }
}

#[async_trait]
impl TrainingRuntime for BinaryTrainingRuntime {
    async fn start(&self, req: TrainingStartReq) -> DomainResult<()> {
        let client = self
            .runtime
            .ensure_started()
            .await
            .map_err(|e| DomainError::repository(e.to_string()))?;
        client
            .training_start(&TrainingStartRequest {
                job_id: req.job_id,
                project_id: req.project_id,
                model_family: req.model_family,
                dataset_path: req.dataset_path,
                config: req.config,
                log_path: req.log_path,
            })
            .await
            .map_err(|e| DomainError::repository(e.to_string()))?;
        Ok(())
    }

    async fn stop(&self, job_id: &str) -> DomainResult<()> {
        if let Some(client) = self.runtime.try_client() {
            client
                .training_stop(&JobIdRequest {
                    job_id: job_id.to_string(),
                })
                .await
                .map_err(|e| DomainError::repository(e.to_string()))?;
        }
        Ok(())
    }
}
