//! Keeps Studio's record of a run in step with the agent training it, and
//! brings the results home when it finishes.
//!
//! A finished run's artifacts are unpacked into the same place a local run
//! writes them — `<training-logs>/<job_id>/` — so reports, ONNX export and
//! "serve this version" work on a remote run without knowing it was remote.
//! Once Studio has the results the job is deleted from the agent: Studio is
//! the system of record, the agent only a worker.

use std::path::{Path, PathBuf};

use serde_json::{json, Value};
use vailabel_agent_client::{archive, status, AgentClient, AgentError, JobView};
use vailabel_training::application::SyncTrainingUpdate;
use vailabel_training::domain::TrainingRun;

use super::agents::{AgentResolver, RunMeta};

/// Log polls per sync; a run's whole log is at most this many 256 KB chunks.
const MAX_LOG_CHUNKS: usize = 400;

/// Where a run's artifacts live locally: next to its log, in a folder named
/// after the job (the layout the embedded trainer produces).
pub fn local_run_dir(run: &TrainingRun) -> Option<PathBuf> {
    let log = PathBuf::from(run.log_path.as_deref()?);
    Some(log.parent()?.join(&run.id))
}

fn failed(run: &TrainingRun, message: impl Into<String>) -> SyncTrainingUpdate {
    SyncTrainingUpdate {
        job_id: run.id.clone(),
        status: status::FAILED.into(),
        progress: run.progress,
        metrics: Value::Null,
        error: Some(message.into()),
    }
}

/// Copy the agent's log for a run to its local log file.
async fn save_log(client: &AgentClient, run: &TrainingRun) {
    let Some(log_path) = run.log_path.as_deref() else {
        return;
    };
    let mut lines: Vec<String> = Vec::new();
    let mut offset = 0;
    for _ in 0..MAX_LOG_CHUNKS {
        let Ok(chunk) = client.logs(&run.id, offset).await else {
            return; // keep whatever log is already on disk
        };
        let stalled = chunk.next_offset <= offset;
        offset = chunk.next_offset;
        lines.extend(chunk.lines);
        if chunk.eof || stalled {
            break;
        }
    }
    if let Some(parent) = Path::new(log_path).parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    let _ = tokio::fs::write(log_path, lines.join("\n") + "\n").await;
}

/// Download and unpack a finished run's artifacts into `dir`.
async fn fetch_artifacts(client: &AgentClient, job_id: &str, dir: &Path) -> Result<(), String> {
    tokio::fs::create_dir_all(dir)
        .await
        .map_err(|e| e.to_string())?;
    let tar = dir.join("artifacts.download.tar");
    let result = async {
        client
            .download_artifacts(job_id, &tar)
            .await
            .map_err(|e| e.to_string())?;
        let (tar_path, dest) = (tar.clone(), dir.to_path_buf());
        tokio::task::spawn_blocking(move || archive::unpack(&tar_path, &dest))
            .await
            .map_err(|e| e.to_string())?
            .map_err(|e| e.to_string())
            .map(|_| ())
    }
    .await;
    let _ = tokio::fs::remove_file(&tar).await;
    result
}

/// The agent's metrics with its paths replaced by where the files are now.
fn localize_metrics(metrics: &Value, dir: &Path) -> Value {
    let mut map = match metrics {
        Value::Object(map) => map.clone(),
        _ => serde_json::Map::new(),
    };
    let weights = dir.join("weights").join("best.pt");
    if weights.is_file() {
        map.insert("weights".into(), json!(weights.to_string_lossy()));
        map.insert("save_dir".into(), json!(dir.to_string_lossy()));
    } else {
        map.remove("weights");
        map.remove("save_dir");
    }
    Value::Object(map)
}

async fn update_for(client: &AgentClient, run: &TrainingRun, view: JobView) -> SyncTrainingUpdate {
    let mut update = SyncTrainingUpdate {
        job_id: run.id.clone(),
        status: status::for_studio(&view.status).to_string(),
        progress: view.progress,
        metrics: view.metrics.clone(),
        error: view.error.clone(),
    };
    if status::is_in_flight(&view.status) {
        return update;
    }

    if view.status == status::COMPLETED {
        if let (true, Some(dir)) = (view.has_weights, local_run_dir(run)) {
            if let Err(error) = fetch_artifacts(client, &run.id, &dir).await {
                // Trained, but the weights aren't here yet: stay in flight so the
                // next sync retries the download instead of recording a
                // "completed" run that has nothing to export.
                eprintln!(
                    "[training] could not download artifacts for {}: {error}",
                    run.id
                );
                update.status = status::RUNNING.into();
                update.progress = 1.0;
                return update;
            }
            update.metrics = localize_metrics(&view.metrics, &dir);
        }
    }
    save_log(client, run).await;
    // Results are home; free the agent's disk. Best-effort.
    let _ = client.delete_job(&run.id).await;
    update
}

/// Ask each run's agent how it is doing. Runs whose agent can't be reached are
/// left untouched (no update) so a network blip doesn't fail a healthy run.
pub async fn collect_updates(
    agents: &dyn AgentResolver,
    runs: Vec<TrainingRun>,
) -> Vec<SyncTrainingUpdate> {
    let mut updates = Vec::new();
    for run in runs {
        let Some(agent_id) = RunMeta::of(&run.config).agent_id else {
            continue;
        };
        let client = match agents.client_for(&agent_id) {
            Ok(client) => client,
            // The agent was removed (or lost its token): this run can never be
            // collected, so say so rather than leave it "running" forever.
            Err(error) => {
                updates.push(failed(&run, error.to_string()));
                continue;
            }
        };
        match client.job(&run.id).await {
            Ok(view) => updates.push(update_for(&client, &run, view).await),
            Err(AgentError::Api { status: 404, .. }) => updates.push(failed(
                &run,
                "The training agent no longer has this job (it may have been reinstalled).",
            )),
            Err(error) => eprintln!("[training] agent sync skipped for {}: {error}", run.id),
        }
    }
    updates
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn points_metrics_at_the_downloaded_files() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(dir.path().join("weights")).unwrap();
        std::fs::write(dir.path().join("weights/best.pt"), b"w").unwrap();
        let remote = json!({ "epoch": 9, "weights": "/agent/jobs/j/run/j/weights/best.pt", "save_dir": "/agent/x" });

        let local = localize_metrics(&remote, dir.path());

        assert_eq!(local["epoch"], json!(9));
        assert_eq!(
            local["weights"],
            json!(dir.path().join("weights/best.pt").to_string_lossy())
        );
        assert_eq!(local["save_dir"], json!(dir.path().to_string_lossy()));
    }

    #[test]
    fn drops_remote_paths_when_nothing_was_downloaded() {
        let dir = tempfile::tempdir().unwrap();

        let local = localize_metrics(
            &json!({ "weights": "/agent/best.pt", "loss": 0.1 }),
            dir.path(),
        );

        assert_eq!(local, json!({ "loss": 0.1 }));
    }
}
