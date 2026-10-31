//! Studio ↔ agent contract test: Studio's own adapters talking to the real
//! agent service over a real socket. Only the trainer is faked (it writes the
//! files a real run would), so this covers the whole remote path — dataset
//! upload, fine-tune weights, queueing, progress, artifact download, cleanup.

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use serde_json::{json, Value};
use vailabel_agent::config::AgentConfig;
use vailabel_agent::jobs::Engine;
use vailabel_agent::server::AppState as AgentState;
use vailabel_agent::trainer::{Snapshot, TrainSpec, Trainer};
use vailabel_agent_client::AgentClient;
use vailabel_core::{DomainResult, Repository};
use vailabel_training::application::{TrainingRuntime, TrainingStartReq};
use vailabel_training::domain::{TrainingRepository, TrainingRun, TrainingStatus};

use super::agents::{AgentResolver, RunMeta};
use super::remote_port::RoutingTrainingRuntime;
use super::remote_sync;
use crate::AppError;

const TOKEN: &str = "contract-test-token";

/// A trainer that "trains" instantly: records what it was asked to do and
/// writes weights + results where the real trainer would.
#[derive(Default)]
struct InstantTrainer {
    specs: Mutex<Vec<TrainSpec>>,
}

#[async_trait]
impl Trainer for InstantTrainer {
    async fn start(&self, spec: TrainSpec) -> Result<(), String> {
        let log = PathBuf::from(&spec.log_path);
        let output = log.parent().unwrap().join(&spec.job_id);
        std::fs::create_dir_all(output.join("weights")).map_err(|e| e.to_string())?;
        std::fs::write(output.join("weights/best.pt"), b"trained-weights").unwrap();
        std::fs::write(output.join("results.csv"), "epoch,loss\n1,0.5\n").unwrap();
        std::fs::write(&log, "[runtime] epoch 1/1\n[runtime] completed\n").unwrap();
        self.specs.lock().unwrap().push(spec);
        Ok(())
    }
    async fn stop(&self, _job_id: &str) -> Result<(), String> {
        Ok(())
    }
    async fn snapshots(&self) -> Result<Vec<Snapshot>, String> {
        Ok(self
            .specs
            .lock()
            .unwrap()
            .iter()
            .map(|spec| {
                let output = Path::new(&spec.log_path)
                    .parent()
                    .unwrap()
                    .join(&spec.job_id);
                Snapshot {
                    job_id: spec.job_id.clone(),
                    status: "completed".into(),
                    progress: 1.0,
                    metrics: json!({
                        "epoch": 1,
                        "weights": output.join("weights/best.pt").to_string_lossy(),
                        "save_dir": output.to_string_lossy(),
                    }),
                    error: None,
                }
            })
            .collect())
    }
    fn state(&self) -> String {
        "healthy".into()
    }
    async fn gpu(&self) -> Option<String> {
        None
    }
    async fn shutdown(&self) {}
}

struct RunningAgent {
    url: String,
    engine: Arc<Engine>,
    trainer: Arc<InstantTrainer>,
    _dir: tempfile::TempDir,
}

async fn start_agent() -> RunningAgent {
    let dir = tempfile::tempdir().unwrap();
    let mut config = AgentConfig::new("contract".into(), dir.path().into(), "python3".into());
    config.token = TOKEN.into();
    let trainer = Arc::new(InstantTrainer::default());
    let engine = Arc::new(Engine::open(config.jobs_dir(), trainer.clone(), 1).unwrap());
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    let state = AgentState {
        engine: engine.clone(),
        trainer: trainer.clone(),
        config: Arc::new(config),
    };
    tokio::spawn(vailabel_agent::serve(
        listener,
        state,
        std::future::pending(),
    ));
    RunningAgent {
        url,
        engine,
        trainer,
        _dir: dir,
    }
}

struct FixedResolver(String);

impl AgentResolver for FixedResolver {
    fn client_for(&self, agent_id: &str) -> Result<AgentClient, AppError> {
        if agent_id != "agent-1" {
            return Err(AppError::Message("unknown agent".into()));
        }
        super::agents::client(&self.0, TOKEN)
    }
}

/// The local runtime must never be asked to run an agent's job.
struct NoLocalRuntime;

#[async_trait]
impl TrainingRuntime for NoLocalRuntime {
    async fn start(&self, _req: TrainingStartReq) -> DomainResult<()> {
        panic!("a run addressed to an agent was started locally");
    }
    async fn stop(&self, _job_id: &str) -> DomainResult<()> {
        panic!("a run addressed to an agent was stopped locally");
    }
}

#[derive(Default)]
struct MemoryRuns(Mutex<Vec<TrainingRun>>);

impl Repository<TrainingRun> for MemoryRuns {
    fn list(&self) -> DomainResult<Vec<TrainingRun>> {
        Ok(self.0.lock().unwrap().clone())
    }
    fn get(&self, id: &str) -> DomainResult<Option<TrainingRun>> {
        Ok(self
            .0
            .lock()
            .unwrap()
            .iter()
            .find(|run| run.id == id)
            .cloned())
    }
    fn create(&self, run: &TrainingRun) -> DomainResult<TrainingRun> {
        self.0.lock().unwrap().push(run.clone());
        Ok(run.clone())
    }
    fn update(&self, run: &TrainingRun) -> DomainResult<TrainingRun> {
        Ok(run.clone())
    }
    fn delete(&self, _id: &str) -> DomainResult<()> {
        Ok(())
    }
}

impl TrainingRepository for MemoryRuns {
    fn list_by_project(&self, _project_id: &str) -> DomainResult<Vec<TrainingRun>> {
        self.list()
    }
    fn mark_in_flight_failed(&self, _reason: &str) -> DomainResult<Vec<TrainingRun>> {
        Ok(Vec::new())
    }
}

fn run_record(id: &str, config: Value, log_path: &Path) -> TrainingRun {
    TrainingRun {
        id: id.into(),
        project_id: "p1".into(),
        model_id: None,
        name: "yolo training".into(),
        status: TrainingStatus::running(),
        config,
        metrics: Value::Null,
        progress: 0.0,
        log_path: Some(log_path.to_string_lossy().into_owned()),
        error: None,
        created_at: String::new(),
        updated_at: String::new(),
        started_at: None,
        finished_at: None,
    }
}

/// A YOLO export as Studio writes it: `data.yaml` with an absolute `path:`.
fn export_dataset(root: &Path) -> PathBuf {
    std::fs::create_dir_all(root.join("images/train")).unwrap();
    std::fs::create_dir_all(root.join("labels/train")).unwrap();
    std::fs::write(root.join("images/train/a.jpg"), b"jpeg-bytes").unwrap();
    std::fs::write(root.join("labels/train/a.txt"), "0 0.5 0.5 0.2 0.2\n").unwrap();
    let yaml = root.join("data.yaml");
    std::fs::write(
        &yaml,
        format!(
            "path: {}\ntrain: images/train\nval: images/train\nnames: [car]\n",
            root.display()
        ),
    )
    .unwrap();
    yaml
}

#[tokio::test(flavor = "multi_thread")]
async fn trains_on_an_agent_and_brings_the_weights_home() {
    let agent = start_agent().await;
    let studio = tempfile::tempdir().unwrap();
    let yaml = export_dataset(&studio.path().join("dataset"));
    let previous = studio.path().join("previous-best.pt");
    std::fs::write(&previous, b"previous-weights").unwrap();
    let logs_dir = studio.path().join("training-logs");
    std::fs::create_dir_all(&logs_dir).unwrap();
    let log_path = logs_dir.join("run-1.log");

    let config = RunMeta {
        agent_id: Some("agent-1".into()),
        continue_from: Some("last".into()),
        ..RunMeta::default()
    }
    .write_into(json!({ "epochs": 1, "weights": previous.to_string_lossy() }));
    let resolver = Arc::new(FixedResolver(agent.url.clone()));
    let runs = Arc::new(MemoryRuns::default());
    let run = run_record("run-1", config.clone(), &log_path);
    runs.create(&run).unwrap();
    let router = RoutingTrainingRuntime::new(Arc::new(NoLocalRuntime), resolver.clone(), runs);

    // ── Studio starts the run: dataset + base weights travel to the agent ──
    router
        .start(TrainingStartReq {
            job_id: "run-1".into(),
            project_id: "p1".into(),
            model_family: "yolo".into(),
            dataset_path: yaml.to_string_lossy().into_owned(),
            config,
            log_path: log_path.to_string_lossy().into_owned(),
        })
        .await
        .unwrap();

    let job = agent.engine.get("run-1").unwrap();
    let paths = agent.engine.paths("run-1");
    assert_eq!(job.status, "queued");
    assert_eq!(
        std::fs::read(paths.dataset_dir.join("images/train/a.jpg")).unwrap(),
        b"jpeg-bytes"
    );
    assert_eq!(
        std::fs::read(&paths.base_weights).unwrap(),
        b"previous-weights"
    );
    // Studio's bookkeeping and its local weights path never reach the agent.
    assert_eq!(job.config, json!({ "epochs": 1 }));

    // ── The agent trains ──
    agent.engine.tick().await;
    let spec = agent.trainer.specs.lock().unwrap()[0].clone();
    assert_eq!(
        spec.config["weights"],
        json!(paths.base_weights.to_string_lossy())
    );
    let yaml_on_agent = std::fs::read_to_string(&spec.dataset_path).unwrap();
    assert!(yaml_on_agent.starts_with(&format!("path: '{}'", paths.dataset_dir.display())));
    agent.engine.tick().await;
    assert_eq!(agent.engine.get("run-1").unwrap().status, "completed");

    // ── Studio syncs: results land in the local run folder ──
    let updates = remote_sync::collect_updates(resolver.as_ref(), vec![run.clone()]).await;

    assert_eq!(updates.len(), 1);
    let update = &updates[0];
    let local_dir = logs_dir.join("run-1");
    assert_eq!(
        (update.status.as_str(), update.progress),
        ("completed", 1.0)
    );
    assert_eq!(
        std::fs::read(local_dir.join("weights/best.pt")).unwrap(),
        b"trained-weights"
    );
    assert!(local_dir.join("results.csv").is_file());
    assert_eq!(
        update.metrics["weights"],
        json!(local_dir.join("weights/best.pt").to_string_lossy())
    );
    assert_eq!(
        update.metrics["save_dir"],
        json!(local_dir.to_string_lossy())
    );
    assert_eq!(
        std::fs::read_to_string(&log_path).unwrap(),
        "[runtime] epoch 1/1\n[runtime] completed\n"
    );
    // …and the agent's copy is cleaned up.
    assert!(agent.engine.get("run-1").is_err());
    assert!(!paths.dir.exists());
}

#[tokio::test(flavor = "multi_thread")]
async fn reports_a_run_whose_agent_forgot_it_as_failed() {
    let agent = start_agent().await;
    let studio = tempfile::tempdir().unwrap();
    let config = RunMeta {
        agent_id: Some("agent-1".into()),
        ..RunMeta::default()
    }
    .write_into(json!({}));
    let run = run_record("ghost", config, &studio.path().join("ghost.log"));

    let updates = remote_sync::collect_updates(&FixedResolver(agent.url.clone()), vec![run]).await;

    assert_eq!(updates[0].status, "failed");
    assert!(updates[0]
        .error
        .as_deref()
        .unwrap()
        .contains("no longer has this job"));
}

#[tokio::test(flavor = "multi_thread")]
async fn leaves_a_run_alone_when_its_agent_is_unreachable() {
    let studio = tempfile::tempdir().unwrap();
    let config = RunMeta {
        agent_id: Some("agent-1".into()),
        ..RunMeta::default()
    }
    .write_into(json!({}));
    let run = run_record("run-2", config, &studio.path().join("run-2.log"));

    // Nothing listens on port 1.
    let updates =
        remote_sync::collect_updates(&FixedResolver("http://127.0.0.1:1".into()), vec![run]).await;

    assert!(updates.is_empty());
}

#[tokio::test(flavor = "multi_thread")]
async fn cleans_up_the_agent_when_an_upload_fails() {
    let agent = start_agent().await;
    let studio = tempfile::tempdir().unwrap();
    // A dataset folder with no data.yaml: the agent rejects the upload.
    std::fs::create_dir_all(studio.path().join("broken")).unwrap();
    std::fs::write(studio.path().join("broken/readme.txt"), "not a dataset").unwrap();
    let config = RunMeta {
        agent_id: Some("agent-1".into()),
        ..RunMeta::default()
    }
    .write_into(json!({}));
    let router = RoutingTrainingRuntime::new(
        Arc::new(NoLocalRuntime),
        Arc::new(FixedResolver(agent.url.clone())),
        Arc::new(MemoryRuns::default()),
    );

    let outcome = router
        .start(TrainingStartReq {
            job_id: "run-3".into(),
            project_id: "p1".into(),
            model_family: "yolo".into(),
            dataset_path: studio
                .path()
                .join("broken/data.yaml")
                .to_string_lossy()
                .into_owned(),
            config,
            log_path: studio
                .path()
                .join("run-3.log")
                .to_string_lossy()
                .into_owned(),
        })
        .await;

    assert!(outcome.unwrap_err().to_string().contains("data.yaml"));
    assert!(
        agent.engine.get("run-3").is_err(),
        "no half-created job is left behind"
    );
}
