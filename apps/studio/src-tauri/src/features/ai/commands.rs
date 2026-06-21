//! AI model + prediction/inference IPC commands — thin handlers over the
//! binary's `AiService` (held in [`crate::AppState`]). Inference itself runs in
//! the embedded Python runtime.

use serde_json::Value;
use tauri::State;
use vailabel_project::contracts::{EntityIdPayload, ProjectIdPayload};

use super::model::{
    AutoLabelBacklogPayload, GitHubReleaseLookupPayload, ItemIdPayload, ModelActivationPayload,
    ModelImportPayload, ModelInstallPayload, PipelineRunPayload, PredictionActionPayload,
    PredictionBatchActionPayload, PredictionGeneratePayload,
};
use crate::{AppError, AppState};

#[tauri::command]
pub fn ai_models_list(state: State<AppState>) -> Result<Vec<Value>, AppError> {
    state.ai_service.list_ai_models()
}

#[tauri::command]
pub fn ai_models_list_by_project(
    state: State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Vec<Value>, AppError> {
    state
        .ai_service
        .list_ai_models_by_project(&payload.project_id)
}

#[tauri::command]
pub fn ai_models_save(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    state.ai_service.save_ai_model(&app, payload)
}

#[tauri::command]
pub fn ai_models_delete(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: EntityIdPayload,
) -> Result<Value, AppError> {
    state.ai_service.delete_ai_model(&app, &payload.id)
}

#[tauri::command]
pub fn ai_models_set_active(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: ModelActivationPayload,
) -> Result<Value, AppError> {
    state.ai_service.set_active_model(&app, &payload.model_id)
}

#[tauri::command]
pub fn ai_models_import(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: ModelImportPayload,
) -> Result<Value, AppError> {
    state.ai_service.import_ai_model(&app, payload)
}

#[tauri::command]
pub fn ai_models_install(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: ModelInstallPayload,
) -> Result<Value, AppError> {
    state.ai_service.install_ai_model(&app, payload)
}

#[tauri::command]
pub fn ai_models_catalog_releases(
    state: State<AppState>,
    payload: GitHubReleaseLookupPayload,
) -> Result<Vec<Value>, AppError> {
    state.ai_service.list_github_releases(payload)
}

#[tauri::command]
pub fn predictions_list_by_item(
    state: State<AppState>,
    payload: ItemIdPayload,
) -> Result<Vec<Value>, AppError> {
    state
        .ai_service
        .list_predictions_by_image(&payload.item_id)
}

#[tauri::command]
pub async fn predictions_generate(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: PredictionGeneratePayload,
) -> Result<Vec<Value>, AppError> {
    let ai_service = state.ai_service.clone();
    let app = app.clone();

    tauri::async_runtime::spawn_blocking(move || -> Result<Vec<Value>, AppError> {
        ai_service.generate_predictions(&app, payload)
    })
    .await
    .map_err(|error| AppError::Message(format!("AI detection task failed: {error}")))?
}

/// Run a prompt-driven model plugin (SAM click/box-to-segment, open-vocab
/// prompt-to-detect, …) on one image. Like `predictions_generate` it runs on a
/// blocking thread because it invokes ONNX inference, and its drafts land in the
/// same predictions review loop.
#[tauri::command]
pub async fn pipeline_run(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: PipelineRunPayload,
) -> Result<Vec<Value>, AppError> {
    let ai_service = state.ai_service.clone();
    let app = app.clone();

    tauri::async_runtime::spawn_blocking(move || -> Result<Vec<Value>, AppError> {
        ai_service.pipeline_run(&app, payload)
    })
    .await
    .map_err(|error| AppError::Message(format!("AI pipeline task failed: {error}")))?
}

#[tauri::command]
pub fn predictions_accept(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: PredictionActionPayload,
) -> Result<Value, AppError> {
    state
        .ai_service
        .accept_prediction(&app, &payload.prediction_id, payload.label_id.as_deref())
}

#[tauri::command]
pub fn predictions_reject(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: PredictionActionPayload,
) -> Result<Value, AppError> {
    state
        .ai_service
        .reject_prediction(&app, &payload.prediction_id)
}

/// Accept every prediction in `predictionIds` in one call (one event, one reload)
/// — the fast path for "Accept all".
#[tauri::command]
pub fn predictions_accept_batch(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: PredictionBatchActionPayload,
) -> Result<Value, AppError> {
    state
        .ai_service
        .accept_predictions_batch(&app, &payload.prediction_ids)
}

/// Reject every prediction in `predictionIds` in one call (one event, one reload).
#[tauri::command]
pub fn predictions_reject_batch(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: PredictionBatchActionPayload,
) -> Result<Value, AppError> {
    state
        .ai_service
        .reject_predictions_batch(&app, &payload.prediction_ids)
}

/// Batch "auto-label the backlog": run the served/active detector over every
/// unlabeled item in the project. Runs on a blocking thread (ONNX/Python
/// inference) and streams progress on the `studio://activity` channel.
#[tauri::command]
pub async fn predictions_auto_label_backlog(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: AutoLabelBacklogPayload,
) -> Result<Value, AppError> {
    let ai_service = state.ai_service.clone();
    let app = app.clone();

    tauri::async_runtime::spawn_blocking(move || -> Result<Value, AppError> {
        ai_service.auto_label_backlog(&app, payload)
    })
    .await
    .map_err(|error| AppError::Message(format!("Auto-label task failed: {error}")))?
}

/// Project-wide pending-prediction summary (count + distinct items + one item id
/// to jump to) for the flywheel's "Review N" CTA.
#[tauri::command]
pub fn predictions_count_by_project(
    state: State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Value, AppError> {
    state
        .ai_service
        .count_pending_predictions(&payload.project_id)
}

/// Local AI assistant: the model registry (catalog of models, their task,
/// capabilities, required components, and whether the engine is wired).
#[tauri::command]
pub fn ai_model_registry() -> Result<Vec<Value>, AppError> {
    Ok(super::registry::registry_json())
}
