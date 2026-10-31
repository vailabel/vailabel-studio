//! Training + model-export orchestration for the embedded runtime.
//!
//! These coordinate several composition-root services (training + runtime + AI)
//! and the filesystem, so they live at the shell — a module crate may not touch
//! the runtime client / `std::fs`. The `commands::runtime` handlers delegate
//! here so they stay thin. The one piece that *is* pure domain — parsing
//! ultralytics' `results.csv` — lives in `vailabel_training::domain::results`.

use serde_json::{json, Value};
use tauri::Manager;

use runtime_manager::ExportRequest;
use vailabel_training::application::{StartTrainingCommand, SyncTrainingUpdate};
use vailabel_training::domain::parse_results_csv;

use vailabel_training::domain::TrainingRun;

use super::agents::RunMeta;
use super::commands::{AgentTestPayload, ExportPayload, JobLogsPayload, TrainingStartPayload};
use super::remote_sync;
use crate::{emit_activity, emit_domain_event, ActivityEvent, AppError, AppState};

/// Where a finished run's best weights are on this machine, if it has any:
/// the trainer-reported path, else the deterministic
/// `<training-logs>/<job_id>/weights/best.pt` layout.
pub fn run_weights(run: &TrainingRun) -> Option<std::path::PathBuf> {
    run.metrics
        .get("weights")
        .and_then(Value::as_str)
        .map(std::path::PathBuf::from)
        .filter(|path| path.is_file())
        .or_else(|| {
            remote_sync::local_run_dir(run)
                .map(|dir| dir.join("weights").join("best.pt"))
                .filter(|path| path.is_file())
        })
}

/// Which trainer family produced a run: recorded on runs Studio started since
/// agents existed; for older runs, read from the trainer's own `args.yaml`.
fn run_family(run: &TrainingRun, weights: &std::path::Path) -> String {
    if let Some(family) = RunMeta::of(&run.config).model_family {
        return family.to_lowercase();
    }
    let args = weights
        .parent()
        .and_then(|dir| dir.parent())
        .map(|dir| dir.join("args.yaml"))
        .and_then(|path| std::fs::read_to_string(path).ok())
        .unwrap_or_default()
        .to_lowercase();
    if args.contains("rtdetr") { "rtdetr" } else { "yolo" }.to_string()
}

/// The project's most recent finished run of `family` that still has weights
/// on disk — what "continue training" fine-tunes from.
pub fn latest_weights(
    state: &AppState,
    project_id: &str,
    family: &str,
) -> Result<Option<(String, std::path::PathBuf)>, AppError> {
    let mut runs: Vec<TrainingRun> = state
        .training_service
        .list()?
        .into_iter()
        .filter(|run| run.project_id == project_id && run.status.as_str() == "completed")
        .collect();
    runs.sort_by(|a, b| b.finished_at.cmp(&a.finished_at));
    Ok(runs.into_iter().find_map(|run| {
        let weights = run_weights(&run)?;
        (run_family(&run, &weights) == family.to_lowercase()).then_some((run.id, weights))
    }))
}

/// `training_start`: the binary owns the filesystem — mint the job id and its
/// log path, then hand off to the training app-service.
pub async fn training_start(
    app: &tauri::AppHandle,
    state: &AppState,
    payload: TrainingStartPayload,
) -> Result<Value, AppError> {
    let job_id = uuid::Uuid::new_v4().to_string();
    let logs_dir = app.path().app_data_dir()?.join("runtime").join("training-logs");
    std::fs::create_dir_all(&logs_dir)?;
    let log_path = logs_dir
        .join(format!("{job_id}.log"))
        .to_string_lossy()
        .to_string();

    // Studio's bookkeeping rides in `config._studio`; trainer options are
    // everything else. Resolve "continue from the last model" to real weights
    // now, so the run records exactly what it started from.
    let mut meta = RunMeta::of(&payload.config);
    meta.model_family = Some(payload.model_family.clone());
    // The baseline automatic retraining measures "new labels" against.
    meta.labeled_items =
        super::auto_retrain::count_labeled_items(state, &payload.project_id).ok();
    let mut config = payload.config;
    if meta.continue_from.as_deref() == Some("last") {
        // No earlier model yet (the project's first run) → train from the stock
        // base weights; the run simply has no `baseRunId`.
        if let Some((run_id, weights)) =
            latest_weights(state, &payload.project_id, &payload.model_family)?
        {
            if !config.is_object() {
                config = json!({});
            }
            config["weights"] = json!(weights.to_string_lossy());
            meta.base_run_id = Some(run_id);
        }
    }
    let config = meta.write_into(config);

    let run = state
        .training_service
        .start(StartTrainingCommand {
            job_id,
            project_id: payload.project_id,
            model_id: payload.model_id,
            model_family: payload.model_family,
            dataset_path: payload.dataset_path,
            name: payload.name,
            config,
            log_path,
        })
        .await?;
    Ok(serde_json::to_value(run)?)
}

/// `training_sync`: pull live job snapshots — from the embedded runtime and from
/// any training agents with runs in flight — and reconcile them into the stored
/// runs (progress/metrics/terminal status). A no-op when nothing is training. Every *changed* run is mirrored to the unified
/// `studio://activity` channel so the global indicator shows live training
/// progress alongside downloads — `sync` returns only changed runs, so a
/// terminal run is emitted exactly once (no re-add after it auto-dismisses).
pub async fn training_sync(
    app: &tauri::AppHandle,
    state: &AppState,
) -> Result<Vec<Value>, AppError> {
    let mut updates: Vec<SyncTrainingUpdate> = Vec::new();

    // Runs on this computer: snapshots from the embedded runtime, when it's up.
    if let Some(client) = state.runtime_service.try_client() {
        if let Ok(jobs) = client.training_jobs().await {
            updates.extend(jobs.into_iter().map(|j| SyncTrainingUpdate {
                job_id: j.job_id,
                status: j.status,
                progress: j.progress,
                metrics: j.metrics,
                error: j.error,
            }));
        }
    }

    // Runs on a training agent. One sync at a time: the UI polls every couple
    // of seconds, and a weights download can easily outlast that — a second
    // overlapping sync would download the same artifacts over the first.
    static REMOTE_SYNC: std::sync::OnceLock<tokio::sync::Mutex<()>> = std::sync::OnceLock::new();
    if let Ok(_guard) = REMOTE_SYNC
        .get_or_init(|| tokio::sync::Mutex::new(()))
        .try_lock()
    {
        let remote: Vec<TrainingRun> = state
            .training_service
            .list()?
            .into_iter()
            .filter(|run| {
                run.status.is_in_flight() && RunMeta::of(&run.config).agent_id.is_some()
            })
            .collect();
        if !remote.is_empty() {
            updates.extend(
                remote_sync::collect_updates(state.agent_resolver.as_ref(), remote).await,
            );
        }
    }

    let changed = state.training_service.sync(updates)?;
    let mut out = Vec::with_capacity(changed.len());
    for run in &changed {
        let value = serde_json::to_value(run).map_err(AppError::from)?;
        emit_training_activity(app, &value);
        out.push(value);
    }
    Ok(out)
}

/// Mirror one training run to the unified activity channel, carrying the run
/// JSON as `data` for any viewmodel that wants the rich record.
fn emit_training_activity(app: &tauri::AppHandle, run: &Value) {
    let status = run.get("status").and_then(Value::as_str).unwrap_or("");
    let id = run.get("id").and_then(Value::as_str).unwrap_or_default();
    let name = run.get("name").and_then(Value::as_str).unwrap_or("Training");
    let progress = run.get("progress").and_then(Value::as_f64).unwrap_or(0.0);
    let message = match status {
        "pending" => "Queued",
        "running" => "Training…",
        "completed" | "succeeded" => "Training complete",
        "failed" => "Training failed",
        "canceled" | "cancelled" => "Training canceled",
        _ => "Training",
    };
    emit_activity(
        app,
        ActivityEvent::from_status(
            format!("training:{id}"),
            "training",
            format!("Training · {name}"),
            status,
        )
        .message(message)
        .percent(Some(progress * 100.0))
        .data(run.clone()),
    );
}

/// `training_logs`: stream per-job logs from the runtime, falling back to the
/// on-disk log file when the runtime isn't serving them.
pub async fn training_logs(state: &AppState, payload: JobLogsPayload) -> Result<Value, AppError> {
    // A run still training on an agent: its log is there, not here. (Once it
    // finishes, sync copies the log locally and the fallback below serves it.)
    if let Some(run) = state.training_service.get(&payload.job_id)? {
        if let (true, Some(agent_id)) =
            (run.status.is_in_flight(), RunMeta::of(&run.config).agent_id)
        {
            if let Ok(client) = state.agent_resolver.client_for(&agent_id) {
                if let Ok(chunk) = client.logs(&payload.job_id, payload.offset).await {
                    return Ok(serde_json::to_value(chunk)?);
                }
            }
        }
    }
    let svc = state.runtime_service.clone();
    if let Some(client) = svc.try_client() {
        if let Ok(chunk) = client.training_logs(&payload.job_id, payload.offset).await {
            return Ok(serde_json::to_value(chunk)?);
        }
    }
    let path = state
        .training_service
        .get(&payload.job_id)?
        .and_then(|run| run.log_path);
    let lines = match path {
        Some(p) => std::fs::read_to_string(p)
            .unwrap_or_default()
            .lines()
            .map(str::to_owned)
            .collect::<Vec<_>>(),
        None => Vec::new(),
    };
    Ok(json!({ "lines": lines, "next_offset": 0, "eof": true }))
}

/// Register a successfully-exported ONNX file as a detection `ai_model` so it
/// shows up in the model picker / auto-label control. Returns the saved row.
fn register_onnx_as_model(state: &AppState, output_path: &str) -> Result<Value, AppError> {
    let name = std::path::Path::new(output_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Exported model")
        .to_string();
    let row = json!({
        "id": uuid::Uuid::new_v4().to_string(),
        "name": name,
        "modelPath": output_path,
        "type": "detection",
        "backend": "onnx",
        "framework": "onnx",
        "status": "inactive",
        "isCustom": true,
    });
    let model: vailabel_models::domain::AiModel = serde_json::from_value(row)?;
    let (stored, _) = state.ai_model_repo.save_atomic(&model)?;
    Ok(stored.to_value())
}

/// Run a model export through the runtime for the given `format`.
pub async fn run_export(
    state: &AppState,
    payload: ExportPayload,
    format: &str,
) -> Result<Value, AppError> {
    let client = state.runtime_service.clone().ensure_started().await?;
    let req = ExportRequest {
        model_path: payload.model_path,
        format: format.to_string(),
        output_path: payload.output_path,
        opts: payload.opts,
    };
    let result = match format {
        "onnx" => client.export_onnx(&req).await?,
        "tensorrt" => client.export_tensorrt(&req).await?,
        "openvino" => client.export_openvino(&req).await?,
        other => return Err(AppError::Message(format!("Unsupported export format: {other}"))),
    };
    Ok(serde_json::to_value(result)?)
}

/// `export_onnx`: export, then register the result as an `ai_model` (it can feed
/// the in-process `ort` hot path).
pub async fn export_onnx(
    app: &tauri::AppHandle,
    state: &AppState,
    payload: ExportPayload,
) -> Result<Value, AppError> {
    let output_path = payload.output_path.clone();
    let result = run_export(state, payload, "onnx").await?;

    if result.get("ok").and_then(Value::as_bool).unwrap_or(false) {
        let saved = register_onnx_as_model(state, &output_path)?;
        let _ = emit_domain_event(app, "ai_model", "created", &saved);
    }
    Ok(result)
}

/// `training_export_onnx`: export a finished job's weights to ONNX and register
/// the result as a detection model — the bridge that turns a trained run into an
/// auto-labeler. Resolves the weights from `metrics.weights` or the deterministic
/// `<training-logs>/<job_id>/weights/best.pt` layout.
pub async fn training_export_onnx(
    app: &tauri::AppHandle,
    state: &AppState,
    job_id: String,
) -> Result<Value, AppError> {
    let run = state
        .training_service
        .get(&job_id)?
        .ok_or_else(|| AppError::Message(format!("Training job {job_id} not found")))?;

    // The exported ONNX path is deterministic per run. If this version was already
    // served, just re-activate that model (fast, no duplicate export/registration)
    // — this is what makes the flywheel's one-click "Serve this version" idempotent.
    let models_dir = app.path().app_data_dir()?.join("runtime").join("models");
    std::fs::create_dir_all(&models_dir)?;
    let output_path = models_dir
        .join(format!("{}-{job_id}.onnx", sanitize_stem(&run.name)))
        .to_string_lossy()
        .to_string();

    if state
        .ai_service
        .serve_existing_detector_by_path(app, &output_path)?
        .is_some()
    {
        return Ok(json!({ "ok": true, "reused": true, "outputPath": output_path }));
    }

    let weights = run_weights(&run)
        .ok_or_else(|| {
            AppError::Message(
                "No trained weights found for this job. Train with the embedded runtime \
                 (real ultralytics, not the simulated trainer) and let it finish first."
                    .into(),
            )
        })?;

    let client = state.runtime_service.clone().ensure_started().await?;
    let result = serde_json::to_value(
        client
            .export_onnx(&ExportRequest {
                model_path: weights.to_string_lossy().to_string(),
                format: "onnx".into(),
                output_path: output_path.clone(),
                opts: Value::Null,
            })
            .await?,
    )?;

    if result.get("ok").and_then(Value::as_bool).unwrap_or(false) {
        let class_names = project_class_names(state, &run.project_id)?;
        let _ = state.ai_service.register_trained_onnx(
            app,
            std::path::Path::new(&output_path),
            &run.name,
            Some(&run.project_id),
            class_names,
        )?;
    }
    Ok(result)
}

/// The project's label names in storage order — the class vocabulary the dataset
/// export used, so a trained model's class indices map back to these labels.
fn project_class_names(state: &AppState, project_id: &str) -> Result<Vec<String>, AppError> {
    let labels: Vec<Value> = state
        .label_repo
        .list_by_project(project_id)?
        .iter()
        .map(serde_json::to_value)
        .collect::<Result<_, _>>()?;
    Ok(labels
        .iter()
        .filter_map(|l| l.get("name").and_then(Value::as_str))
        .map(|n| n.trim().to_string())
        .filter(|n| !n.is_empty())
        .collect())
}

/// Filesystem-safe stem from a run name (alphanumerics kept, the rest collapsed).
fn sanitize_stem(name: &str) -> String {
    let s: String = name
        .trim()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect();
    let s = s.trim_matches('-').to_string();
    if s.is_empty() {
        "model".into()
    } else {
        s
    }
}

/// `training_report`: final-epoch metrics from ultralytics' `results.csv` plus
/// the paths of the plots it renders. Read-only — no runtime call needed.
pub fn training_report(state: &AppState, job_id: String) -> Result<Value, AppError> {
    let run = state
        .training_service
        .get(&job_id)?
        .ok_or_else(|| AppError::Message(format!("Training job {job_id} not found")))?;

    let dir = report_dir(&run.metrics, run.log_path.as_deref()).ok_or_else(|| {
        AppError::Message(
            "No training artifacts found for this job. Reports are available only for runs the \
             embedded ultralytics trainer completed (it writes results.csv + plots)."
                .into(),
        )
    })?;

    let csv = std::fs::read_to_string(dir.join("results.csv")).unwrap_or_default();
    let (columns, rows) = parse_results_csv(&csv);

    // One JSON object per epoch, keyed by column name (NaN → null). The frontend
    // charts mAP/loss curves from this; `final` is kept as the last row so older
    // consumers that only read final-epoch metrics keep working.
    let row_to_obj = |values: &[f64]| {
        let mut obj = serde_json::Map::new();
        for (name, value) in columns.iter().zip(values.iter()) {
            obj.insert(name.clone(), json!(value));
        }
        Value::Object(obj)
    };
    let history: Vec<Value> = rows.iter().map(|values| row_to_obj(values)).collect();

    let final_row = rows.last();
    let final_metrics = match final_row {
        Some(values) => row_to_obj(values),
        None => Value::Object(serde_json::Map::new()),
    };
    let epochs = final_row
        .and_then(|r| columns.iter().position(|c| c == "epoch").and_then(|i| r.get(i)))
        .map(|e| *e as i64)
        .unwrap_or(rows.len() as i64);

    // Plots ultralytics renders into the run dir; return only the ones present.
    let plots: Vec<Value> = [
        ("Training curves", "results.png"),
        ("Confusion matrix", "confusion_matrix.png"),
        ("Precision–Recall", "BoxPR_curve.png"),
        ("F1 curve", "BoxF1_curve.png"),
        ("Validation predictions", "val_batch0_pred.jpg"),
    ]
    .iter()
    .filter_map(|(label, file)| {
        let path = dir.join(file);
        path.exists()
            .then(|| json!({ "label": label, "path": path.to_string_lossy() }))
    })
    .collect();

    Ok(json!({
        "jobId": job_id,
        "name": run.name,
        "saveDir": dir.to_string_lossy(),
        "epochs": epochs,
        "final": final_metrics,
        "history": history,
        "plots": plots,
    }))
}

/// Locate the ultralytics run directory holding `results.csv`/plots: prefer the
/// trainer-reported `save_dir`, then the weights' grandparent (`…/weights/best.pt`),
/// then the log file's directory.
fn report_dir(metrics: &Value, log_path: Option<&str>) -> Option<std::path::PathBuf> {
    let has_results = |p: &std::path::Path| p.join("results.csv").exists();

    if let Some(dir) = metrics.get("save_dir").and_then(Value::as_str) {
        let p = std::path::PathBuf::from(dir);
        if has_results(&p) {
            return Some(p);
        }
    }
    if let Some(weights) = metrics.get("weights").and_then(Value::as_str) {
        if let Some(dir) = std::path::Path::new(weights).parent().and_then(|p| p.parent()) {
            if has_results(dir) {
                return Some(dir.to_path_buf());
            }
        }
    }
    if let Some(dir) = log_path.and_then(|lp| std::path::Path::new(lp).parent()) {
        if has_results(dir) {
            return Some(dir.to_path_buf());
        }
    }
    None
}

/// `training_agent_test`: reach an agent and report who answered. Takes either
/// a saved agent's id (token from the keychain) or an address + token being
/// typed into the "add agent" form.
pub async fn training_agent_test(
    state: &AppState,
    payload: AgentTestPayload,
) -> Result<Value, AppError> {
    let client = match (payload.agent_id, payload.url, payload.token) {
        (_, Some(url), Some(token)) if !token.trim().is_empty() => {
            super::agents::client(&url, &token)?
        }
        (Some(agent_id), _, _) => state.agent_resolver.client_for(&agent_id)?,
        _ => {
            return Err(AppError::Message(
                "Enter the agent's address and access token.".into(),
            ))
        }
    };
    let info = client
        .info()
        .await
        .map_err(|error| AppError::Message(error.to_string()))?;
    Ok(serde_json::to_value(info)?)
}
