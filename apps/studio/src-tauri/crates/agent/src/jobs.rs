//! The job engine: the agent's durable job table, its FIFO queue, and the loop
//! that keeps it in step with the trainer.
//!
//! Every job lives in `<data>/jobs/<id>/`:
//!
//! ```text
//! job.json        the persisted record (survives restarts)
//! dataset/        the unpacked upload; `dataset_entry` names the file to train on
//! base.pt         optional uploaded weights to fine-tune from
//! run/<id>.log    training log
//! run/<id>/       trainer output (weights/best.pt, results.csv, plots)
//! ```
//!
//! That `run/` layout is what Studio already uses locally, so downloaded
//! artifacts drop straight into place on the desktop.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use vailabel_agent_client::{status, CreateJobRequest, JobView};

use crate::trainer::{Snapshot, TrainSpec, Trainer};

#[derive(Debug)]
pub enum EngineError {
    NotFound(String),
    /// The request is fine but the job is in the wrong state for it.
    Conflict(String),
    Invalid(String),
    Io(String),
}

impl std::fmt::Display for EngineError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotFound(id) => write!(f, "No job with id {id}."),
            Self::Conflict(m) | Self::Invalid(m) | Self::Io(m) => f.write_str(m),
        }
    }
}

impl From<std::io::Error> for EngineError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error.to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub model_family: String,
    #[serde(default)]
    pub config: Value,
    pub status: String,
    #[serde(default)]
    pub progress: f32,
    #[serde(default)]
    pub metrics: Value,
    #[serde(default)]
    pub error: Option<String>,
    /// Dataset file to train on, relative to `dataset/`; set once uploaded.
    #[serde(default)]
    pub dataset_entry: Option<String>,
    #[serde(default)]
    pub has_base_weights: bool,
    pub created_at: String,
    /// When the job entered the queue — the FIFO key.
    #[serde(default)]
    pub queued_at: Option<String>,
    #[serde(default)]
    pub started_at: Option<String>,
    #[serde(default)]
    pub finished_at: Option<String>,
}

/// Where one job's files live.
#[derive(Debug, Clone)]
pub struct JobPaths {
    pub dir: PathBuf,
    pub record: PathBuf,
    pub dataset_dir: PathBuf,
    pub base_weights: PathBuf,
    pub run_dir: PathBuf,
    pub log: PathBuf,
    /// The trainer's output directory for this job.
    pub output_dir: PathBuf,
}

/// Files of a finished run that Studio downloads (those that exist).
pub const ARTIFACT_FILES: &[&str] = &[
    "weights/best.pt",
    "results.csv",
    "args.yaml",
    "results.png",
    "confusion_matrix.png",
    "confusion_matrix_normalized.png",
    "BoxPR_curve.png",
    "BoxF1_curve.png",
    "BoxP_curve.png",
    "BoxR_curve.png",
    "labels.jpg",
    "val_batch0_labels.jpg",
    "val_batch0_pred.jpg",
];

fn now() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Micros, true)
}

/// Job ids become directory names, so only a conservative alphabet is allowed.
pub fn is_valid_job_id(id: &str) -> bool {
    (1..=64).contains(&id.len())
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

pub struct Engine {
    root: PathBuf,
    jobs: Mutex<BTreeMap<String, Job>>,
    trainer: Arc<dyn Trainer>,
    max_concurrent: u32,
}

impl Engine {
    /// Load the job table from `root`. Jobs that were training when the agent
    /// last stopped are marked failed: the trainer process died with it.
    pub fn open(
        root: PathBuf,
        trainer: Arc<dyn Trainer>,
        max_concurrent: u32,
    ) -> Result<Self, EngineError> {
        std::fs::create_dir_all(&root)?;
        let mut jobs = BTreeMap::new();
        for entry in std::fs::read_dir(&root)? {
            let record = entry?.path().join("job.json");
            let Ok(text) = std::fs::read_to_string(&record) else {
                continue;
            };
            match serde_json::from_str::<Job>(&text) {
                Ok(job) => {
                    jobs.insert(job.id.clone(), job);
                }
                Err(error) => {
                    eprintln!("[agent] skipping unreadable {}: {error}", record.display())
                }
            }
        }
        let engine = Self {
            root,
            jobs: Mutex::new(jobs),
            trainer,
            max_concurrent: max_concurrent.max(1),
        };
        engine.fail_interrupted();
        Ok(engine)
    }

    fn fail_interrupted(&self) {
        let mut jobs = self.jobs.lock().unwrap();
        for job in jobs.values_mut() {
            if matches!(job.status.as_str(), status::RUNNING | status::PENDING) {
                job.status = status::FAILED.into();
                job.error = Some("The agent restarted while this job was training.".into());
                job.finished_at = Some(now());
                self.persist(job);
            }
        }
    }

    pub fn paths(&self, id: &str) -> JobPaths {
        let dir = self.root.join(id);
        let run_dir = dir.join("run");
        JobPaths {
            record: dir.join("job.json"),
            dataset_dir: dir.join("dataset"),
            base_weights: dir.join("base.pt"),
            log: run_dir.join(format!("{id}.log")),
            output_dir: run_dir.join(id),
            run_dir,
            dir,
        }
    }

    /// Write the record atomically; a failure is logged, not fatal — the
    /// in-memory table stays authoritative while the agent runs.
    fn persist(&self, job: &Job) {
        let paths = self.paths(&job.id);
        let write = || -> std::io::Result<()> {
            std::fs::create_dir_all(&paths.dir)?;
            let tmp = paths.dir.join("job.json.tmp");
            std::fs::write(&tmp, serde_json::to_vec_pretty(job)?)?;
            std::fs::rename(tmp, &paths.record)
        };
        if let Err(error) = write() {
            eprintln!("[agent] could not save job {}: {error}", job.id);
        }
    }

    /// Apply `change` to a job and persist it.
    fn update<T>(
        &self,
        id: &str,
        change: impl FnOnce(&mut Job) -> Result<T, EngineError>,
    ) -> Result<T, EngineError> {
        let mut jobs = self.jobs.lock().unwrap();
        let job = jobs
            .get_mut(id)
            .ok_or_else(|| EngineError::NotFound(id.to_string()))?;
        let out = change(job)?;
        self.persist(job);
        Ok(out)
    }

    pub fn create(&self, request: CreateJobRequest) -> Result<Job, EngineError> {
        if !is_valid_job_id(&request.job_id) {
            return Err(EngineError::Invalid(
                "Job ids may only contain letters, digits, '-' and '_' (max 64).".into(),
            ));
        }
        if !request.config.is_null() && !request.config.is_object() {
            return Err(EngineError::Invalid(
                "`config` must be a JSON object.".into(),
            ));
        }
        let mut jobs = self.jobs.lock().unwrap();
        if jobs.contains_key(&request.job_id) {
            return Err(EngineError::Conflict(format!(
                "Job {} already exists.",
                request.job_id
            )));
        }
        let job = Job {
            name: request
                .name
                .filter(|name| !name.trim().is_empty())
                .unwrap_or_else(|| format!("{} training", request.model_family)),
            id: request.job_id,
            project_id: request.project_id,
            model_family: request.model_family,
            config: request.config,
            status: status::CREATED.into(),
            progress: 0.0,
            metrics: Value::Null,
            error: None,
            dataset_entry: None,
            has_base_weights: false,
            created_at: now(),
            queued_at: None,
            started_at: None,
            finished_at: None,
        };
        self.persist(&job);
        jobs.insert(job.id.clone(), job.clone());
        Ok(job)
    }

    pub fn get(&self, id: &str) -> Result<Job, EngineError> {
        self.jobs
            .lock()
            .unwrap()
            .get(id)
            .cloned()
            .ok_or_else(|| EngineError::NotFound(id.to_string()))
    }

    /// All jobs, oldest first.
    pub fn list(&self) -> Vec<Job> {
        let mut jobs: Vec<Job> = self.jobs.lock().unwrap().values().cloned().collect();
        jobs.sort_by(|a, b| a.created_at.cmp(&b.created_at));
        jobs
    }

    fn require_created(job: &Job, action: &str) -> Result<(), EngineError> {
        if job.status == status::CREATED {
            Ok(())
        } else {
            Err(EngineError::Conflict(format!(
                "Cannot {action}: the job is already {}.",
                job.status
            )))
        }
    }

    /// Check a job can still receive uploads (before spending time on one).
    pub fn ensure_accepts_uploads(&self, id: &str) -> Result<(), EngineError> {
        Self::require_created(&self.get(id)?, "upload")
    }

    pub fn set_dataset(&self, id: &str, entry: String) -> Result<Job, EngineError> {
        self.update(id, |job| {
            Self::require_created(job, "replace the dataset")?;
            job.dataset_entry = Some(entry);
            Ok(job.clone())
        })
    }

    pub fn set_base_weights(&self, id: &str) -> Result<Job, EngineError> {
        self.update(id, |job| {
            Self::require_created(job, "replace the base weights")?;
            job.has_base_weights = true;
            Ok(job.clone())
        })
    }

    /// Put a job in the queue. It starts on the next tick with a free slot.
    pub fn queue(&self, id: &str) -> Result<Job, EngineError> {
        self.update(id, |job| {
            Self::require_created(job, "start")?;
            if job.dataset_entry.is_none() {
                return Err(EngineError::Conflict(
                    "Upload the dataset before starting the job.".into(),
                ));
            }
            job.status = status::QUEUED.into();
            job.queued_at = Some(now());
            Ok(job.clone())
        })
    }

    /// Cancel a job. Finished jobs are returned unchanged.
    pub async fn stop(&self, id: &str) -> Result<Job, EngineError> {
        let before = self.get(id)?;
        if !status::is_in_flight(&before.status) {
            return Ok(before);
        }
        if matches!(before.status.as_str(), status::RUNNING | status::PENDING) {
            // Best-effort: a stop on an already-dead run must not fail the cancel.
            let _ = self.trainer.stop(id).await;
        }
        self.update(id, |job| {
            if status::is_in_flight(&job.status) {
                job.status = status::CANCELED.into();
                job.finished_at = Some(now());
            }
            Ok(job.clone())
        })
    }

    /// Delete a job and its files. Refused while it is training.
    pub fn delete(&self, id: &str) -> Result<(), EngineError> {
        let mut jobs = self.jobs.lock().unwrap();
        let job = jobs
            .get(id)
            .ok_or_else(|| EngineError::NotFound(id.to_string()))?;
        if matches!(job.status.as_str(), status::RUNNING | status::PENDING) {
            return Err(EngineError::Conflict(
                "Stop the job before deleting it.".into(),
            ));
        }
        jobs.remove(id);
        drop(jobs);
        let dir = self.paths(id).dir;
        if dir.exists() {
            std::fs::remove_dir_all(dir)?;
        }
        Ok(())
    }

    /// `(running, queued)` job counts.
    pub fn counts(&self) -> (u32, u32) {
        let jobs = self.jobs.lock().unwrap();
        let count = |wanted: &[&str]| {
            jobs.values()
                .filter(|job| wanted.contains(&job.status.as_str()))
                .count() as u32
        };
        (
            count(&[status::RUNNING, status::PENDING]),
            count(&[status::QUEUED]),
        )
    }

    pub fn max_concurrent(&self) -> u32 {
        self.max_concurrent
    }

    pub fn view(&self, job: &Job) -> JobView {
        let paths = self.paths(&job.id);
        JobView {
            id: job.id.clone(),
            project_id: job.project_id.clone(),
            name: job.name.clone(),
            model_family: job.model_family.clone(),
            status: job.status.clone(),
            progress: job.progress,
            metrics: job.metrics.clone(),
            error: job.error.clone(),
            has_dataset: job.dataset_entry.is_some(),
            has_base_weights: job.has_base_weights,
            has_weights: paths.output_dir.join("weights/best.pt").is_file(),
            created_at: job.created_at.clone(),
            started_at: job.started_at.clone(),
            finished_at: job.finished_at.clone(),
        }
    }

    fn spec_for(&self, job: &Job) -> TrainSpec {
        let paths = self.paths(&job.id);
        let mut config = match &job.config {
            Value::Object(map) => map.clone(),
            _ => serde_json::Map::new(),
        };
        if job.has_base_weights {
            // Fine-tune: start from the uploaded weights instead of a stock model.
            config.insert(
                "weights".into(),
                Value::String(paths.base_weights.to_string_lossy().into_owned()),
            );
        }
        TrainSpec {
            job_id: job.id.clone(),
            project_id: job.project_id.clone(),
            model_family: job.model_family.clone(),
            dataset_path: paths
                .dataset_dir
                .join(job.dataset_entry.as_deref().unwrap_or("data.yaml"))
                .to_string_lossy()
                .into_owned(),
            config: Value::Object(config),
            log_path: paths.log.to_string_lossy().into_owned(),
        }
    }

    fn apply_snapshot(job: &mut Job, snapshot: &Snapshot) {
        job.status = snapshot.status.clone();
        job.progress = snapshot.progress;
        if !snapshot.metrics.is_null() {
            job.metrics = snapshot.metrics.clone();
        }
        if snapshot.error.is_some() {
            job.error = snapshot.error.clone();
        }
        if !status::is_in_flight(&job.status) && job.finished_at.is_none() {
            job.finished_at = Some(now());
        }
    }

    /// Pull the trainer's view into the running jobs. A running job the trainer
    /// no longer knows was lost to a trainer restart.
    async fn reconcile(&self) {
        let Ok(snapshots) = self.trainer.snapshots().await else {
            // Trainer unavailable (not started yet, or restarting): try next tick.
            return;
        };
        let mut jobs = self.jobs.lock().unwrap();
        for job in jobs
            .values_mut()
            .filter(|job| job.status == status::RUNNING)
        {
            match snapshots.iter().find(|snapshot| snapshot.job_id == job.id) {
                Some(snapshot) => Self::apply_snapshot(job, snapshot),
                None => {
                    job.status = status::FAILED.into();
                    job.error = Some("The training runtime restarted and lost this job.".into());
                    job.finished_at = Some(now());
                }
            }
            self.persist(job);
        }
    }

    /// Claim the oldest queued job if a slot is free, marking it pending.
    fn claim_next(&self) -> Option<Job> {
        let mut jobs = self.jobs.lock().unwrap();
        let active = jobs
            .values()
            .filter(|job| matches!(job.status.as_str(), status::RUNNING | status::PENDING))
            .count() as u32;
        if active >= self.max_concurrent {
            return None;
        }
        let id = jobs
            .values()
            .filter(|job| job.status == status::QUEUED)
            .min_by(|a, b| (&a.queued_at, &a.id).cmp(&(&b.queued_at, &b.id)))?
            .id
            .clone();
        let job = jobs.get_mut(&id)?;
        job.status = status::PENDING.into();
        self.persist(job);
        Some(job.clone())
    }

    /// One scheduler step: sync running jobs with the trainer, then start
    /// queued jobs while slots are free. Called on a timer by the service.
    pub async fn tick(&self) {
        self.reconcile().await;

        while let Some(job) = self.claim_next() {
            let paths = self.paths(&job.id);
            let prepared = std::fs::create_dir_all(&paths.run_dir).map_err(|e| e.to_string());
            let outcome = match prepared {
                Ok(()) => self.trainer.start(self.spec_for(&job)).await,
                Err(error) => Err(error),
            };
            let canceled = self
                .update(&job.id, |current| {
                    // Canceled while the trainer was starting: leave it canceled.
                    if current.status != status::PENDING {
                        return Ok(true);
                    }
                    match &outcome {
                        Ok(()) => {
                            current.status = status::RUNNING.into();
                            current.started_at = Some(now());
                        }
                        Err(error) => {
                            current.status = status::FAILED.into();
                            current.error = Some(error.clone());
                            current.finished_at = Some(now());
                        }
                    }
                    Ok(false)
                })
                .unwrap_or(false);
            if canceled && outcome.is_ok() {
                let _ = self.trainer.stop(&job.id).await;
            }
        }
    }
}

/// Point a YOLO `data.yaml` at where the dataset was unpacked. The exporter
/// writes an absolute `path:` for the machine it ran on; the trainer resolves
/// the split folders against that line.
pub fn rebase_dataset_yaml(yaml: &Path, dataset_dir: &Path) -> std::io::Result<()> {
    let text = std::fs::read_to_string(yaml)?;
    let rebased = format!("path: {}", yaml_quote(&dataset_dir.to_string_lossy()));
    let mut replaced = false;
    let mut lines: Vec<String> = text
        .lines()
        .map(|line| {
            if !replaced && line.starts_with("path:") {
                replaced = true;
                rebased.clone()
            } else {
                line.to_string()
            }
        })
        .collect();
    if !replaced {
        lines.insert(0, rebased);
    }
    std::fs::write(yaml, lines.join("\n") + "\n")
}

/// A YAML single-quoted scalar (safe for any path, including spaces and colons).
fn yaml_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use async_trait::async_trait;
    use serde_json::json;

    /// A scriptable in-memory trainer.
    #[derive(Default)]
    pub struct FakeTrainer {
        pub started: Mutex<Vec<TrainSpec>>,
        pub stopped: Mutex<Vec<String>>,
        pub known: Mutex<Vec<Snapshot>>,
        /// When set, `snapshots()` fails with this message (trainer down).
        pub unreachable: Mutex<Option<String>>,
        pub fail_start: Mutex<Option<String>>,
    }

    impl FakeTrainer {
        pub fn report(&self, job_id: &str, status: &str, progress: f32) {
            let mut known = self.known.lock().unwrap();
            known.retain(|snapshot| snapshot.job_id != job_id);
            known.push(Snapshot {
                job_id: job_id.into(),
                status: status.into(),
                progress,
                metrics: json!({ "epoch": 1 }),
                error: None,
            });
        }
    }

    #[async_trait]
    impl Trainer for FakeTrainer {
        async fn start(&self, spec: TrainSpec) -> Result<(), String> {
            if let Some(error) = self.fail_start.lock().unwrap().clone() {
                return Err(error);
            }
            self.report(&spec.job_id, status::RUNNING, 0.0);
            self.started.lock().unwrap().push(spec);
            Ok(())
        }
        async fn stop(&self, job_id: &str) -> Result<(), String> {
            self.stopped.lock().unwrap().push(job_id.into());
            Ok(())
        }
        async fn snapshots(&self) -> Result<Vec<Snapshot>, String> {
            match self.unreachable.lock().unwrap().clone() {
                Some(error) => Err(error),
                None => Ok(self.known.lock().unwrap().clone()),
            }
        }
        fn state(&self) -> String {
            "healthy".into()
        }
        async fn gpu(&self) -> Option<String> {
            Some("Fake GPU".into())
        }
        async fn shutdown(&self) {}
    }

    pub fn request(id: &str) -> CreateJobRequest {
        CreateJobRequest {
            job_id: id.into(),
            project_id: "p1".into(),
            model_family: "yolo".into(),
            name: None,
            config: json!({ "epochs": 3 }),
        }
    }

    fn engine(dir: &Path, max: u32) -> (Engine, Arc<FakeTrainer>) {
        let trainer = Arc::new(FakeTrainer::default());
        (
            Engine::open(dir.into(), trainer.clone(), max).unwrap(),
            trainer,
        )
    }

    fn ready(engine: &Engine, id: &str) {
        engine.create(request(id)).unwrap();
        engine.set_dataset(id, "data.yaml".into()).unwrap();
        engine.queue(id).unwrap();
    }

    #[tokio::test]
    async fn runs_queued_jobs_one_at_a_time_in_order() {
        let dir = tempfile::tempdir().unwrap();
        let (engine, trainer) = engine(dir.path(), 1);
        ready(&engine, "a");
        ready(&engine, "b");

        engine.tick().await;
        assert_eq!(engine.get("a").unwrap().status, status::RUNNING);
        assert_eq!(engine.get("b").unwrap().status, status::QUEUED);

        trainer.report("a", status::COMPLETED, 1.0);
        engine.tick().await;

        let a = engine.get("a").unwrap();
        assert_eq!((a.status.as_str(), a.progress), (status::COMPLETED, 1.0));
        assert!(a.finished_at.is_some());
        assert_eq!(engine.get("b").unwrap().status, status::RUNNING);
    }

    #[tokio::test]
    async fn passes_the_unpacked_dataset_and_base_weights_to_the_trainer() {
        let dir = tempfile::tempdir().unwrap();
        let (engine, trainer) = engine(dir.path(), 1);
        engine.create(request("a")).unwrap();
        engine.set_dataset("a", "data.yaml".into()).unwrap();
        engine.set_base_weights("a").unwrap();
        engine.queue("a").unwrap();

        engine.tick().await;

        let spec = trainer.started.lock().unwrap()[0].clone();
        let paths = engine.paths("a");
        assert_eq!(
            spec.dataset_path,
            paths.dataset_dir.join("data.yaml").to_string_lossy()
        );
        assert_eq!(
            spec.config["weights"],
            json!(paths.base_weights.to_string_lossy())
        );
        assert_eq!(spec.config["epochs"], json!(3));
        assert_eq!(spec.log_path, paths.log.to_string_lossy());
    }

    #[tokio::test]
    async fn refuses_to_start_without_a_dataset() {
        let dir = tempfile::tempdir().unwrap();
        let (engine, _) = engine(dir.path(), 1);
        engine.create(request("a")).unwrap();

        assert!(matches!(engine.queue("a"), Err(EngineError::Conflict(_))));
    }

    #[tokio::test]
    async fn records_a_trainer_that_fails_to_start() {
        let dir = tempfile::tempdir().unwrap();
        let (engine, trainer) = engine(dir.path(), 1);
        *trainer.fail_start.lock().unwrap() = Some("no GPU".into());
        ready(&engine, "a");

        engine.tick().await;

        let job = engine.get("a").unwrap();
        assert_eq!(job.status, status::FAILED);
        assert_eq!(job.error.as_deref(), Some("no GPU"));
    }

    #[tokio::test]
    async fn fails_a_running_job_the_trainer_forgot() {
        let dir = tempfile::tempdir().unwrap();
        let (engine, trainer) = engine(dir.path(), 1);
        ready(&engine, "a");
        engine.tick().await;

        trainer.known.lock().unwrap().clear();
        engine.tick().await;

        assert_eq!(engine.get("a").unwrap().status, status::FAILED);
    }

    #[tokio::test]
    async fn leaves_running_jobs_alone_while_the_trainer_is_unreachable() {
        let dir = tempfile::tempdir().unwrap();
        let (engine, trainer) = engine(dir.path(), 1);
        ready(&engine, "a");
        engine.tick().await;

        *trainer.unreachable.lock().unwrap() = Some("restarting".into());
        engine.tick().await;

        assert_eq!(engine.get("a").unwrap().status, status::RUNNING);
    }

    #[tokio::test]
    async fn cancels_queued_and_running_jobs_and_never_resurrects_them() {
        let dir = tempfile::tempdir().unwrap();
        let (engine, trainer) = engine(dir.path(), 1);
        ready(&engine, "a");
        ready(&engine, "b");
        engine.tick().await;

        engine.stop("b").await.unwrap();
        engine.stop("a").await.unwrap();
        trainer.report("a", status::RUNNING, 0.5);
        engine.tick().await;

        assert_eq!(engine.get("a").unwrap().status, status::CANCELED);
        assert_eq!(engine.get("b").unwrap().status, status::CANCELED);
        assert_eq!(*trainer.stopped.lock().unwrap(), vec!["a".to_string()]);
    }

    #[tokio::test]
    async fn survives_a_restart_and_fails_what_was_training() {
        let dir = tempfile::tempdir().unwrap();
        {
            let (engine, _) = engine(dir.path(), 1);
            ready(&engine, "a");
            ready(&engine, "b");
            engine.tick().await;
        }

        let (reopened, _) = engine(dir.path(), 1);

        let a = reopened.get("a").unwrap();
        assert_eq!(a.status, status::FAILED);
        assert!(a.error.unwrap().contains("restarted"));
        assert_eq!(reopened.get("b").unwrap().status, status::QUEUED);
    }

    #[tokio::test]
    async fn rejects_ids_that_are_not_safe_directory_names() {
        let dir = tempfile::tempdir().unwrap();
        let (engine, _) = engine(dir.path(), 1);

        for bad in ["../x", "a/b", "", "a b", &"x".repeat(65)] {
            assert!(
                matches!(engine.create(request(bad)), Err(EngineError::Invalid(_))),
                "{bad}"
            );
        }
        assert!(engine.create(request("ok-1_2")).is_ok());
        assert!(matches!(
            engine.create(request("ok-1_2")),
            Err(EngineError::Conflict(_))
        ));
    }

    #[tokio::test]
    async fn deletes_finished_jobs_but_not_training_ones() {
        let dir = tempfile::tempdir().unwrap();
        let (engine, trainer) = engine(dir.path(), 1);
        ready(&engine, "a");
        engine.tick().await;

        assert!(matches!(engine.delete("a"), Err(EngineError::Conflict(_))));
        trainer.report("a", status::COMPLETED, 1.0);
        engine.tick().await;
        engine.delete("a").unwrap();

        assert!(matches!(engine.get("a"), Err(EngineError::NotFound(_))));
        assert!(!engine.paths("a").dir.exists());
    }

    #[test]
    fn rebases_the_dataset_yaml_onto_the_unpacked_folder() {
        let dir = tempfile::tempdir().unwrap();
        let yaml = dir.path().join("data.yaml");
        std::fs::write(
            &yaml,
            "path: C:\\Users\\me\\ds\ntrain: images/train\nnames: [car]\n",
        )
        .unwrap();

        rebase_dataset_yaml(&yaml, Path::new("/var/lib/agent/it's here")).unwrap();

        assert_eq!(
            std::fs::read_to_string(&yaml).unwrap(),
            "path: '/var/lib/agent/it''s here'\ntrain: images/train\nnames: [car]\n"
        );
    }

    #[test]
    fn adds_a_path_line_when_the_yaml_has_none() {
        let dir = tempfile::tempdir().unwrap();
        let yaml = dir.path().join("data.yaml");
        std::fs::write(&yaml, "train: images/train\n").unwrap();

        rebase_dataset_yaml(&yaml, Path::new("/d")).unwrap();

        assert_eq!(
            std::fs::read_to_string(&yaml).unwrap(),
            "path: '/d'\ntrain: images/train\n"
        );
    }
}
