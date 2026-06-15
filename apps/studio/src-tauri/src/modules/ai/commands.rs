use crate::modules::ai::copilot::CopilotTurnResult;
use crate::modules::ai::model::{
    CopilotActionPayload, CopilotTestPayload, CopilotTestResult, CopilotTurnPayload,
    GitHubReleaseLookupPayload, ImageIdPayload, ModelActivationPayload, ModelImportPayload,
    ModelInstallPayload, PipelineRunPayload, PredictionActionPayload, PredictionGeneratePayload,
    RuntimeInstallPayload,
};
use crate::modules::projects::model::{EntityIdPayload, ProjectIdPayload};
use crate::{AppError, AppState};
use serde_json::Value;
use tauri::State;

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
pub fn predictions_list_by_image(
    state: State<AppState>,
    payload: ImageIdPayload,
) -> Result<Vec<Value>, AppError> {
    state
        .ai_service
        .list_predictions_by_image(&payload.image_id)
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

/// Local AI assistant: report ONNX Runtime execution providers and host info
/// (GPU detection / runtime capabilities).
#[tauri::command]
pub fn ai_gpu_info() -> Result<Value, AppError> {
    Ok(crate::gpu::gpu_info())
}

/// Local AI assistant: the model registry (catalog of models, their task,
/// capabilities, required ONNX components, and whether the engine is wired).
#[tauri::command]
pub fn ai_model_registry() -> Result<Vec<Value>, AppError> {
    Ok(crate::modules::ai::registry::registry_json())
}

/// Auto-provision the ONNX Runtime native library (and cuDNN for CUDA) by
/// downloading Microsoft's package into the app data dir, so AI detect works
/// without the manual DLL setup in docs/ONNXRUNTIME_GPU_SETUP.md. Streams
/// `ai-runtime-install://progress` events; the new runtime activates on restart.
#[tauri::command]
pub async fn ai_runtime_install(
    app: tauri::AppHandle,
    payload: RuntimeInstallPayload,
) -> Result<Value, AppError> {
    #[cfg(feature = "yolo-inference")]
    {
        let gpu = payload.gpu.unwrap_or(true);
        let app = app.clone();
        return tauri::async_runtime::spawn_blocking(move || {
            crate::modules::ai::runtime_setup::ensure_runtime(&app, gpu)
        })
        .await
        .map_err(|error| AppError::Message(format!("Runtime install task failed: {error}")))?;
    }
    #[cfg(not(feature = "yolo-inference"))]
    {
        let _ = (app, payload);
        Err(AppError::Message(
            "This desktop build does not include local ONNX inference support.".into(),
        ))
    }
}

/// Report whether a bundled ONNX Runtime (and cuDNN) are already on disk.
#[tauri::command]
pub fn ai_runtime_status(app: tauri::AppHandle) -> Result<Value, AppError> {
    #[cfg(feature = "yolo-inference")]
    {
        return Ok(crate::modules::ai::runtime_setup::status(&app));
    }
    #[cfg(not(feature = "yolo-inference"))]
    {
        let _ = app;
        Ok(serde_json::json!({ "installed": false, "supported": false }))
    }
}

/// Restart the app so a freshly installed ONNX Runtime is actually loaded
/// (the previous load result is cached for the lifetime of the process).
#[tauri::command]
pub fn ai_runtime_restart(app: tauri::AppHandle) {
    app.restart();
}

/// Local AI copilot: one chat turn. Runs on a blocking thread because it may
/// invoke the ONNX detector (same as `predictions_generate`). The orchestration
/// lives in the copilot module; the inference port (which holds its own
/// `AppHandle`) emits `predictions:generated` exactly as before.
#[tauri::command]
pub async fn ai_copilot_turn(
    state: State<'_, AppState>,
    payload: CopilotTurnPayload,
) -> Result<CopilotTurnResult, AppError> {
    let copilot_service = state.copilot_service.clone();

    tauri::async_runtime::spawn_blocking(move || copilot_service.turn(payload))
        .await
        .map_err(|error| AppError::Message(format!("AI copilot task failed: {error}")))?
        .map_err(AppError::from)
}

/// Local AI copilot: apply a user-approved action (relabel / delete / new label).
#[tauri::command]
pub fn ai_copilot_apply_action(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: CopilotActionPayload,
) -> Result<Value, AppError> {
    state.ai_service.copilot_apply_action(&app, payload)
}

/// Local AI copilot: test a manually configured server (Settings → AI Copilot)
/// by probing its `/models`. Runs on a blocking thread because it does network
/// I/O with short timeouts.
#[tauri::command]
pub async fn ai_copilot_test_connection(
    state: State<'_, AppState>,
    payload: CopilotTestPayload,
) -> Result<CopilotTestResult, AppError> {
    let copilot_service = state.copilot_service.clone();
    tauri::async_runtime::spawn_blocking(move || copilot_service.test_connection(payload))
        .await
        .map_err(|error| AppError::Message(format!("AI copilot test task failed: {error}")))
}
