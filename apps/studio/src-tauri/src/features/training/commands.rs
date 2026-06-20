//! Training + model-export IPC commands — thin dispatchers over [`super::ops`]
//! (which coordinates the training service, the runtime client, and `AiService`).

use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use vailabel_training::application::StopTrainingCommand;

use crate::{AppError, AppState};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdPayload {
    pub id: String,
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

// ───────────────────────────── Training ─────────────────────────────

#[tauri::command]
pub async fn training_start(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: TrainingStartPayload,
) -> Result<Value, AppError> {
    super::ops::training_start(&app, state.inner(), payload).await
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

#[tauri::command]
pub async fn training_sync(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<Value>, AppError> {
    super::ops::training_sync(&app, state.inner()).await
}

#[tauri::command]
pub async fn training_logs(
    state: State<'_, AppState>,
    payload: JobLogsPayload,
) -> Result<Value, AppError> {
    super::ops::training_logs(state.inner(), payload).await
}

#[tauri::command]
pub fn training_report(state: State<'_, AppState>, payload: IdPayload) -> Result<Value, AppError> {
    super::ops::training_report(state.inner(), payload.id)
}

// ───────────────────────────── Export ───────────────────────────────

#[tauri::command]
pub async fn export_onnx(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: ExportPayload,
) -> Result<Value, AppError> {
    super::ops::export_onnx(&app, state.inner(), payload).await
}

#[tauri::command]
pub async fn export_tensorrt(
    state: State<'_, AppState>,
    payload: ExportPayload,
) -> Result<Value, AppError> {
    super::ops::run_export(state.inner(), payload, "tensorrt").await
}

#[tauri::command]
pub async fn export_openvino(
    state: State<'_, AppState>,
    payload: ExportPayload,
) -> Result<Value, AppError> {
    super::ops::run_export(state.inner(), payload, "openvino").await
}

#[tauri::command]
pub async fn training_export_onnx(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: IdPayload,
) -> Result<Value, AppError> {
    super::ops::training_export_onnx(&app, state.inner(), payload.id).await
}
