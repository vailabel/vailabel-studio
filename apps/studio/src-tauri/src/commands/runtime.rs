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
use vailabel_training::application::{StartTrainingCommand, StopTrainingCommand};

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
        let name = std::path::Path::new(&output_path)
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
        let saved = {
            let guard = lock_store(&state.store)?;
            guard.upsert_entity("ai_model", row)?
        };
        let _ = emit_domain_event(&app, "ai_model", "created", &saved);
    }
    Ok(result)
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
    crate::modules::runtime::glue::list_models(&state.store)
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
        crate::modules::runtime::glue::install_runtime_model(&app2, store, &id)
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
