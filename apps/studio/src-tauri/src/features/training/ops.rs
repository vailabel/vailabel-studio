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

use super::commands::{ExportPayload, JobLogsPayload, TrainingStartPayload};
use crate::{emit_domain_event, AppError, AppState};

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

    let run = state
        .training_service
        .start(StartTrainingCommand {
            job_id,
            project_id: payload.project_id,
            model_id: payload.model_id,
            model_family: payload.model_family,
            dataset_path: payload.dataset_path,
            name: payload.name,
            config: payload.config,
            log_path,
        })
        .await?;
    Ok(serde_json::to_value(run)?)
}

/// `training_sync`: pull live job snapshots from the runtime and reconcile them
/// into the stored runs (progress/metrics/terminal status). A no-op when the
/// runtime isn't running.
pub async fn training_sync(state: &AppState) -> Result<Vec<Value>, AppError> {
    let svc = state.runtime_service.clone();
    let Some(client) = svc.try_client() else {
        return Ok(Vec::new());
    };
    let jobs = match client.training_jobs().await {
        Ok(jobs) => jobs,
        Err(_) => return Ok(Vec::new()),
    };
    let updates = jobs
        .into_iter()
        .map(|j| SyncTrainingUpdate {
            job_id: j.job_id,
            status: j.status,
            progress: j.progress,
            metrics: j.metrics,
            error: j.error,
        })
        .collect();
    state
        .training_service
        .sync(updates)?
        .into_iter()
        .map(|run| serde_json::to_value(run).map_err(AppError::from))
        .collect()
}

/// `training_logs`: stream per-job logs from the runtime, falling back to the
/// on-disk log file when the runtime isn't serving them.
pub async fn training_logs(state: &AppState, payload: JobLogsPayload) -> Result<Value, AppError> {
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

    let weights = run
        .metrics
        .get("weights")
        .and_then(Value::as_str)
        .map(std::path::PathBuf::from)
        .filter(|p| p.exists())
        .or_else(|| {
            run.log_path.as_ref().and_then(|lp| {
                std::path::Path::new(lp)
                    .parent()
                    .map(|dir| dir.join(&job_id).join("weights").join("best.pt"))
                    .filter(|p| p.exists())
            })
        })
        .ok_or_else(|| {
            AppError::Message(
                "No trained weights found for this job. Train with the embedded runtime \
                 (real ultralytics, not the simulated trainer) and let it finish first."
                    .into(),
            )
        })?;

    let models_dir = app.path().app_data_dir()?.join("runtime").join("models");
    std::fs::create_dir_all(&models_dir)?;
    let output_path = models_dir
        .join(format!("{}-{job_id}.onnx", sanitize_stem(&run.name)))
        .to_string_lossy()
        .to_string();

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
    let final_row = rows.last();
    let mut final_metrics = serde_json::Map::new();
    if let Some(values) = final_row {
        for (name, value) in columns.iter().zip(values.iter()) {
            final_metrics.insert(name.clone(), json!(value));
        }
    }
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
        "final": Value::Object(final_metrics),
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
