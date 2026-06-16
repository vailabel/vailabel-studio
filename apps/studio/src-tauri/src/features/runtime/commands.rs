//! Embedded-runtime IPC commands: lifecycle, heavyweight inference (models the
//! in-Rust ONNX path can't run), and the downloadable model manager. The
//! frontend never talks to the Python process directly — every call goes
//! Frontend → command → RuntimeService → FastAPI → PyTorch.

use serde::Deserialize;
use serde_json::{json, Value};
use tauri::State;

use runtime_manager::{CaptionRequest, DetectRequest, OcrRequest, RuntimeStatus, SegmentRequest};

use crate::{emit_domain_event, AppError, AppState};

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

// ───────────────────────────── Lifecycle ─────────────────────────────

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

// ───────────────────── Inference (heavyweight models) ─────────────────

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

// ───────────────────────────── Model Manager ─────────────────────────

#[tauri::command]
pub fn runtime_models_list(state: State<AppState>) -> Result<Vec<Value>, AppError> {
    super::glue::list_models(&state.runtime_model_repo)
}

#[tauri::command]
pub async fn runtime_models_install(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: IdPayload,
) -> Result<Value, AppError> {
    let store = state.runtime_model_repo.clone();
    let app2 = app.clone();
    let id = payload.id;
    let saved = tauri::async_runtime::spawn_blocking(move || {
        super::glue::install_runtime_model(&app2, store, &id)
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
    super::glue::delete_runtime_model(&state.runtime_model_repo, &payload.id)?;
    let _ = emit_domain_event(&app, "runtime_model", "deleted", &json!({ "id": payload.id }));
    Ok(json!({ "success": true }))
}
