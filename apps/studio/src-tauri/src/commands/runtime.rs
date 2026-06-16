//! Tauri commands for the embedded AI runtime. The frontend never talks to the
//! Python process directly — every call goes Frontend → command → RuntimeService
//! → FastAPI → PyTorch.

use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use tauri::State;

use crate::store::DesktopStore;
use crate::{emit_domain_event, AppError, AppState};
use runtime_manager::{
    CaptionRequest, DetectRequest, ExportRequest, OcrRequest, RuntimeStatus, SegmentRequest,
};
use vailabel_training::application::{
    StartTrainingCommand, StopTrainingCommand, SyncTrainingUpdate,
};

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdPayload {
    pub id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectPayload {
    pub model_path: String,
    pub image_path: String,
    pub conf: Option<f32>,
    pub iou: Option<f32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SegmentPayload {
    pub model_path: String,
    pub image_path: String,
    #[serde(default)]
    pub points: Vec<[f32; 2]>,
    pub box_xyxy: Option<[f32; 4]>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptionPayload {
    pub model_path: String,
    pub image_path: String,
    pub prompt: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrPayload {
    pub model_path: String,
    pub image_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrainingStartPayload {
    pub project_id: String,
    pub model_family: String,
    pub dataset_path: String,
    pub model_id: Option<String>,
    pub name: Option<String>,
    #[serde(default)]
    pub config: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobLogsPayload {
    pub job_id: String,
    #[serde(default)]
    pub offset: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportPayload {
    pub model_path: String,
    pub output_path: String,
    #[serde(default)]
    pub opts: Value,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn lock_store<'a>(
    store: &'a Arc<Mutex<DesktopStore>>,
) -> Result<std::sync::MutexGuard<'a, DesktopStore>, AppError> {
    store
        .lock()
        .map_err(|_| AppError::Message("Desktop store is unavailable".into()))
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn runtime_start(state: State<'_, AppState>) -> Result<RuntimeStatus, AppError> {
    let svc = state.runtime_service.clone();
    svc.start().await?;
    Ok(svc.status())
}

#[tauri::command]
pub async fn runtime_stop(state: State<'_, AppState>) -> Result<RuntimeStatus, AppError> {
    let svc = state.runtime_service.clone();
    svc.stop().await?;
    Ok(svc.status())
}

#[tauri::command]
pub async fn runtime_restart(state: State<'_, AppState>) -> Result<RuntimeStatus, AppError> {
    let svc = state.runtime_service.clone();
    svc.restart().await?;
    Ok(svc.status())
}

#[tauri::command]
pub fn runtime_status(state: State<AppState>) -> Result<RuntimeStatus, AppError> {
    Ok(state.runtime_service.status())
}

/// Tail of the rolling runtime log (last ~64 KB).
#[tauri::command]
pub fn runtime_logs(state: State<AppState>) -> Result<String, AppError> {
    let path = state.runtime_service.config().log_dir.join("runtime.log");
    let data = std::fs::read(&path).unwrap_or_default();
    let start = data.len().saturating_sub(64 * 1024);
    Ok(String::from_utf8_lossy(&data[start..]).into_owned())
}

#[tauri::command]
pub async fn runtime_system_info(state: State<'_, AppState>) -> Result<Value, AppError> {
    let svc = state.runtime_service.clone();
    match svc.try_client() {
        Some(client) => {
            let system = client.system_info().await.ok();
            let gpu = client.gpu_info().await.ok();
            Ok(json!({
                "running": true,
                "status": svc.status(),
                "system": system,
                "gpu": gpu,
            }))
        }
        None => Ok(json!({ "running": false, "status": svc.status() })),
    }
}

// ---------------------------------------------------------------------------
// Inference (heavyweight models that ONNX-in-Rust can't run)
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn runtime_detect(
    state: State<'_, AppState>,
    payload: DetectPayload,
) -> Result<Value, AppError> {
    let client = state.runtime_service.clone().ensure_started().await?;
    let resp = client
        .detect(&DetectRequest {
            model_path: payload.model_path,
            image_path: payload.image_path,
            conf: payload.conf,
            iou: payload.iou,
        })
        .await?;
    Ok(serde_json::to_value(resp)?)
}

#[tauri::command]
pub async fn runtime_segment(
    state: State<'_, AppState>,
    payload: SegmentPayload,
) -> Result<Value, AppError> {
    let client = state.runtime_service.clone().ensure_started().await?;
    let resp = client
        .segment(&SegmentRequest {
            model_path: payload.model_path,
            image_path: payload.image_path,
            points: payload.points,
            box_xyxy: payload.box_xyxy,
        })
        .await?;
    Ok(serde_json::to_value(resp)?)
}

#[tauri::command]
pub async fn runtime_caption(
    state: State<'_, AppState>,
    payload: CaptionPayload,
) -> Result<Value, AppError> {
    let client = state.runtime_service.clone().ensure_started().await?;
    let resp = client
        .caption(&CaptionRequest {
            model_path: payload.model_path,
            image_path: payload.image_path,
            prompt: payload.prompt,
        })
        .await?;
    Ok(serde_json::to_value(resp)?)
}

#[tauri::command]
pub async fn runtime_ocr(
    state: State<'_, AppState>,
    payload: OcrPayload,
) -> Result<Value, AppError> {
    let client = state.runtime_service.clone().ensure_started().await?;
    let resp = client
        .ocr(&OcrRequest {
            model_path: payload.model_path,
            image_path: payload.image_path,
        })
        .await?;
    Ok(serde_json::to_value(resp)?)
}

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn training_start(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: TrainingStartPayload,
) -> Result<Value, AppError> {
    use tauri::Manager;

    // The binary owns the filesystem: mint the job id and create its log path.
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

#[tauri::command]
pub async fn training_stop(
    state: State<'_, AppState>,
    payload: IdPayload,
) -> Result<Value, AppError> {
    Ok(state
        .training_service
        .stop(StopTrainingCommand::new(payload.id))
        .await?)
}

#[tauri::command]
pub fn training_list(state: State<AppState>) -> Result<Vec<Value>, AppError> {
    state
        .training_service
        .list()?
        .into_iter()
        .map(|run| serde_json::to_value(run).map_err(AppError::from))
        .collect()
}

/// Pull live job snapshots from the runtime and reconcile them into the stored
/// runs (progress/metrics/terminal status). The runtime owns live progress; this
/// is how the DB-backed list and its `training_job` events catch up. A no-op when
/// the runtime isn't running. The frontend polls this while a job is active.
#[tauri::command]
pub async fn training_sync(state: State<'_, AppState>) -> Result<Vec<Value>, AppError> {
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

/// Stream per-job training logs from the runtime (falls back to the on-disk file
/// if the runtime isn't serving them).
#[tauri::command]
pub async fn training_logs(
    state: State<'_, AppState>,
    payload: JobLogsPayload,
) -> Result<Value, AppError> {
    let svc = state.runtime_service.clone();
    if let Some(client) = svc.try_client() {
        if let Ok(chunk) = client.training_logs(&payload.job_id, payload.offset).await {
            return Ok(serde_json::to_value(chunk)?);
        }
    }
    // Fallback: read the persisted log file (log path from the training module).
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

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/// Register a successfully-exported ONNX file as a detection `ai_model` so it
/// shows up in the model picker / auto-label control. Returns the saved row.
fn register_onnx_as_model(
    state: &State<'_, AppState>,
    output_path: &str,
) -> Result<Value, AppError> {
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
    let guard = lock_store(&state.store)?;
    Ok(guard.upsert_entity("ai_model", row)?)
}

async fn run_export(
    state: &State<'_, AppState>,
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

#[tauri::command]
pub async fn export_onnx(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: ExportPayload,
) -> Result<Value, AppError> {
    let output_path = payload.output_path.clone();
    let result = run_export(&state, payload, "onnx").await?;

    // A successful ONNX export can feed the existing in-process `ort` hot path —
    // register it as an `ai_model` so it shows up in the model picker.
    if result.get("ok").and_then(Value::as_bool).unwrap_or(false) {
        let saved = register_onnx_as_model(&state, &output_path)?;
        let _ = emit_domain_event(&app, "ai_model", "created", &saved);
    }
    Ok(result)
}

/// Export a finished training job's weights to ONNX and register the result as a
/// detection model — the bridge that turns a trained run into an auto-labeler.
/// Resolves the weights from what the trainer reported (`metrics.weights`) or
/// the deterministic `<training-logs>/<job_id>/weights/best.pt` layout.
#[tauri::command]
pub async fn training_export_onnx(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: IdPayload,
) -> Result<Value, AppError> {
    use tauri::Manager;
    let job_id = payload.id;

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

    // On success, register the ONNX as a prediction-ready detection model so it
    // appears in the labeler's Auto-label control. Class names come from the
    // project's labels (same order the dataset export used), so detection class
    // indices line up with the trained model.
    if result.get("ok").and_then(Value::as_bool).unwrap_or(false) {
        let class_names = project_class_names(&state, &run.project_id)?;
        let _ = state.ai_service.register_trained_onnx(
            &app,
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
fn project_class_names(
    state: &State<'_, AppState>,
    project_id: &str,
) -> Result<Vec<String>, AppError> {
    let guard = lock_store(&state.store)?;
    let labels = guard.list_by_field("labels", "project_id", project_id)?;
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

/// Build a training report for a finished job: the final-epoch metrics parsed
/// from ultralytics' `results.csv` (mAP50, precision, recall, losses) plus the
/// paths of the plots ultralytics renders (`results.png`, `confusion_matrix.png`,
/// PR/F1 curves). The frontend shows the numbers and loads the images via the
/// asset protocol. Read-only — no runtime call needed.
#[tauri::command]
pub fn training_report(state: State<'_, AppState>, payload: IdPayload) -> Result<Value, AppError> {
    let job_id = payload.id;
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

    let (columns, rows) = parse_results_csv(&dir.join("results.csv"));
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

/// Parse ultralytics `results.csv` into (column names, numeric rows). Returns
/// empty vectors when the file is missing/unreadable so the report degrades to
/// just plots. Non-numeric cells become NaN (serialized as JSON null).
fn parse_results_csv(path: &std::path::Path) -> (Vec<String>, Vec<Vec<f64>>) {
    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return (Vec::new(), Vec::new()),
    };
    let mut lines = content.lines();
    let columns: Vec<String> = match lines.next() {
        Some(header) => header.split(',').map(|s| s.trim().to_string()).collect(),
        None => return (Vec::new(), Vec::new()),
    };
    let rows = lines
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            line.split(',')
                .map(|cell| cell.trim().parse::<f64>().unwrap_or(f64::NAN))
                .collect::<Vec<_>>()
        })
        .collect();
    (columns, rows)
}

#[tauri::command]
pub async fn export_tensorrt(
    state: State<'_, AppState>,
    payload: ExportPayload,
) -> Result<Value, AppError> {
    run_export(&state, payload, "tensorrt").await
}

#[tauri::command]
pub async fn export_openvino(
    state: State<'_, AppState>,
    payload: ExportPayload,
) -> Result<Value, AppError> {
    run_export(&state, payload, "openvino").await
}

// ---------------------------------------------------------------------------
// Model Manager
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn runtime_models_list(state: State<AppState>) -> Result<Vec<Value>, AppError> {
    crate::runtime::glue::list_models(&state.store)
}

#[tauri::command]
pub async fn runtime_models_install(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: IdPayload,
) -> Result<Value, AppError> {
    let store = state.store.clone();
    let app2 = app.clone();
    let id = payload.id;
    let saved = tauri::async_runtime::spawn_blocking(move || {
        crate::runtime::glue::install_runtime_model(&app2, store, &id)
    })
    .await
    .map_err(|e| AppError::Message(format!("Model install task failed: {e}")))??;
    let _ = emit_domain_event(&app, "runtime_model", "updated", &saved);
    Ok(saved)
}

#[tauri::command]
pub fn runtime_models_delete(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: IdPayload,
) -> Result<Value, AppError> {
    {
        let guard = lock_store(&state.store)?;
        if let Some(v) = guard.get_entity("runtime_model", &payload.id)? {
            if let Some(p) = v
                .get("localPath")
                .or_else(|| v.get("local_path"))
                .and_then(Value::as_str)
            {
                let _ = std::fs::remove_file(p);
            }
        }
        guard.delete_entity("runtime_model", &payload.id)?;
    }
    let _ = emit_domain_event(&app, "runtime_model", "deleted", &json!({ "id": payload.id }));
    Ok(json!({ "success": true }))
}
