//! TrainingAppService behavior tests with in-memory fakes (no DB, no runtime).

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use serde_json::Value;
use vailabel_core::{DomainError, DomainResult, Repository};
use vailabel_shared::{EventPublisher, PortError};

use vailabel_training::application::{
    StartTrainingCommand, StopTrainingCommand, TrainingAppService, TrainingRuntime, TrainingStartReq,
};
use vailabel_training::domain::TrainingRepository;
use vailabel_training::TrainingRun;

#[derive(Default)]
struct FakeRepo {
    runs: Mutex<HashMap<String, TrainingRun>>,
}

impl Repository<TrainingRun> for FakeRepo {
    fn list(&self) -> DomainResult<Vec<TrainingRun>> {
        Ok(self.runs.lock().unwrap().values().cloned().collect())
    }
    fn get(&self, id: &str) -> DomainResult<Option<TrainingRun>> {
        Ok(self.runs.lock().unwrap().get(id).cloned())
    }
    fn create(&self, entity: &TrainingRun) -> DomainResult<TrainingRun> {
        self.runs
            .lock()
            .unwrap()
            .insert(entity.id.clone(), entity.clone());
        Ok(entity.clone())
    }
    fn update(&self, entity: &TrainingRun) -> DomainResult<TrainingRun> {
        self.create(entity)
    }
    fn delete(&self, id: &str) -> DomainResult<()> {
        self.runs.lock().unwrap().remove(id);
        Ok(())
    }
}

impl TrainingRepository for FakeRepo {
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<TrainingRun>> {
        Ok(self
            .runs
            .lock()
            .unwrap()
            .values()
            .filter(|r| r.project_id == project_id)
            .cloned()
            .collect())
    }
    fn mark_in_flight_failed(&self, reason: &str) -> DomainResult<Vec<TrainingRun>> {
        let mut guard = self.runs.lock().unwrap();
        let mut changed = Vec::new();
        for run in guard.values_mut() {
            if run.status.is_in_flight() {
                run.status = vailabel_training::TrainingStatus::failed();
                run.error = Some(reason.to_string());
                changed.push(run.clone());
            }
        }
        Ok(changed)
    }
}

struct FakeRuntime {
    fail: bool,
}

#[async_trait]
impl TrainingRuntime for FakeRuntime {
    async fn start(&self, _req: TrainingStartReq) -> DomainResult<()> {
        if self.fail {
            Err(DomainError::repository("runtime refused"))
        } else {
            Ok(())
        }
    }
    async fn stop(&self, _job_id: &str) -> DomainResult<()> {
        Ok(())
    }
}

#[derive(Default)]
struct RecordingEvents {
    calls: Mutex<Vec<(String, String)>>,
}

impl EventPublisher for RecordingEvents {
    fn publish(&self, entity: &str, action: &str, _payload: &Value) -> Result<(), PortError> {
        self.calls
            .lock()
            .unwrap()
            .push((entity.to_string(), action.to_string()));
        Ok(())
    }
}

fn service(
    fail_runtime: bool,
) -> (
    TrainingAppService,
    Arc<FakeRepo>,
    Arc<RecordingEvents>,
) {
    let repo = Arc::new(FakeRepo::default());
    let events = Arc::new(RecordingEvents::default());
    let svc = TrainingAppService::new(
        repo.clone(),
        Arc::new(FakeRuntime { fail: fail_runtime }),
        events.clone(),
    );
    (svc, repo, events)
}

fn start_cmd() -> StartTrainingCommand {
    StartTrainingCommand {
        job_id: "job-1".into(),
        project_id: "p1".into(),
        model_id: None,
        model_family: "yolo".into(),
        dataset_path: "/data".into(),
        name: None,
        config: serde_json::json!({ "epochs": 10 }),
        log_path: "/logs/job.log".into(),
    }
}

#[tokio::test]
async fn start_success_marks_running_and_emits_created_then_updated() {
    let (svc, repo, events) = service(false);
    let run = svc.start(start_cmd()).await.unwrap();
    assert_eq!(run.status.as_str(), "running");
    assert_eq!(run.project_id, "p1");
    assert_eq!(repo.list().unwrap().len(), 1);
    assert_eq!(
        *events.calls.lock().unwrap(),
        vec![
            ("training_job".to_string(), "created".to_string()),
            ("training_job".to_string(), "updated".to_string()),
        ]
    );
}

#[tokio::test]
async fn start_failure_persists_failed_and_propagates_error() {
    let (svc, repo, events) = service(true);
    let result = svc.start(start_cmd()).await;
    assert!(result.is_err());
    let runs = repo.list().unwrap();
    assert_eq!(runs.len(), 1);
    assert_eq!(runs[0].status.as_str(), "failed");
    assert!(runs[0].error.is_some());
    // The pending was persisted+emitted before the failing runtime call.
    assert_eq!(events.calls.lock().unwrap().len(), 2);
}

#[tokio::test]
async fn stop_marks_canceled() {
    let (svc, repo, _events) = service(false);
    svc.start(start_cmd()).await.unwrap();
    let id = repo.list().unwrap()[0].id.clone();
    let saved = svc.stop(StopTrainingCommand::new(id)).await.unwrap();
    assert_eq!(saved["status"], "canceled");
}

#[tokio::test]
async fn reconcile_marks_in_flight_failed() {
    let (svc, repo, events) = service(false);
    svc.start(start_cmd()).await.unwrap(); // ends "running" (in-flight)
    events.calls.lock().unwrap().clear();
    svc.reconcile_in_flight_failed().unwrap();
    assert_eq!(repo.list().unwrap()[0].status.as_str(), "failed");
    assert_eq!(events.calls.lock().unwrap().len(), 1);
}
