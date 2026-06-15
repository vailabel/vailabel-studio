//! The Training use-case service.

use std::sync::Arc;

use serde_json::{json, Value};
use vailabel_core::{DomainError, DomainResult};
use vailabel_shared::{new_id, now_iso, EventPublisher, PortError};

use crate::application::commands::{StartTrainingCommand, StopTrainingCommand};
use crate::application::ports::{TrainingRuntime, TrainingStartReq};
use crate::domain::{TrainingEvent, TrainingRepository, TrainingRun, TrainingStatus};

/// Event entity name — unchanged from the pre-refactor `"training_job"`.
const ENTITY: &str = "training_job";

/// Orchestrates the training-run lifecycle over the repository, the runtime
/// port, and the event port. Depends only on those ports (injected at the
/// composition root), so it carries no HTTP/Tauri/diesel knowledge.
pub struct TrainingAppService {
    repo: Arc<dyn TrainingRepository + Send + Sync>,
    runtime: Arc<dyn TrainingRuntime>,
    events: Arc<dyn EventPublisher>,
}

impl TrainingAppService {
    pub fn new(
        repo: Arc<dyn TrainingRepository + Send + Sync>,
        runtime: Arc<dyn TrainingRuntime>,
        events: Arc<dyn EventPublisher>,
    ) -> Self {
        Self {
            repo,
            runtime,
            events,
        }
    }

    /// Start a training run: persist `pending` (emit created), ask the runtime to
    /// start it, reconcile to `running`/`failed` (emit updated), and return the
    /// stored run — propagating the runtime error after persisting `failed`,
    /// matching the pre-refactor `training_start`.
    pub async fn start(&self, command: StartTrainingCommand) -> DomainResult<TrainingRun> {
        let job_id = new_id();
        let now = now_iso();
        let name = command
            .name
            .clone()
            .unwrap_or_else(|| format!("{} training", command.model_family));

        let pending = TrainingRun {
            id: job_id.clone(),
            project_id: command.project_id.clone(),
            model_id: command.model_id.clone(),
            name,
            status: TrainingStatus::pending(),
            config: command.config.clone(),
            metrics: Value::Null,
            progress: 0.0,
            log_path: Some(command.log_path.clone()),
            error: None,
            created_at: now.clone(),
            updated_at: now.clone(),
            started_at: Some(now),
            finished_at: None,
        };
        let pending = self.repo.create(&pending)?;
        self.publish(&pending, &TrainingEvent::Created { id: job_id.clone() })?;

        let outcome = self
            .runtime
            .start(TrainingStartReq {
                job_id: job_id.clone(),
                project_id: command.project_id,
                model_family: command.model_family,
                dataset_path: command.dataset_path,
                config: command.config,
                log_path: command.log_path,
            })
            .await;

        let mut run = pending;
        match &outcome {
            Ok(()) => run.status = TrainingStatus::running(),
            Err(err) => {
                run.status = TrainingStatus::failed();
                run.error = Some(err.to_string());
                run.finished_at = Some(now_iso());
            }
        }
        let saved = self.repo.update(&run)?;
        self.publish(&saved, &TrainingEvent::Updated { id: job_id })?;

        outcome?;
        Ok(saved)
    }

    /// Stop (cancel) a run: best-effort runtime stop, then mark `canceled` (emit
    /// updated). Returns the run JSON (or `{ id, status: "canceled" }` when the
    /// run is unknown), matching `training_stop`.
    pub async fn stop(&self, command: StopTrainingCommand) -> DomainResult<Value> {
        // Best-effort — a stop on an already-dead job must not fail the command.
        let _ = self.runtime.stop(&command.id).await;

        let saved = match self.repo.get(&command.id)? {
            Some(mut run) => {
                run.status = TrainingStatus::canceled();
                run.finished_at = Some(now_iso());
                let updated = self.repo.update(&run)?;
                to_value(&updated)?
            }
            None => json!({ "id": command.id, "status": "canceled" }),
        };
        self.events
            .publish(ENTITY, "updated", &saved)
            .map_err(PortError::into_domain)?;
        Ok(saved)
    }

    /// All training runs (across projects) — the `training_list` query.
    pub fn list(&self) -> DomainResult<Vec<TrainingRun>> {
        self.repo.list()
    }

    /// On a runtime crash, mark every in-flight run `failed` and emit an updated
    /// event per changed run (matches `reconcile_jobs_on_crash`).
    pub fn reconcile_in_flight_failed(&self) -> DomainResult<()> {
        let changed = self.repo.mark_in_flight_failed("runtime crashed")?;
        for run in &changed {
            self.publish(run, &TrainingEvent::Updated { id: run.id.clone() })?;
        }
        Ok(())
    }

    fn publish(&self, run: &TrainingRun, event: &TrainingEvent) -> DomainResult<()> {
        let payload = to_value(run)?;
        self.events
            .publish(ENTITY, event.action(), &payload)
            .map_err(PortError::into_domain)
    }
}

fn to_value(run: &TrainingRun) -> DomainResult<Value> {
    serde_json::to_value(run).map_err(|e| DomainError::repository(e.to_string()))
}
