//! AI copilot IPC commands — thin handlers over the pure `CopilotAppService`
//! (held in [`crate::AppState`]) and the `AiService` apply-action path.

use serde_json::Value;
use tauri::State;

use crate::features::ai::copilot::CopilotTurnResult;
use crate::features::ai::model::{
    CopilotActionPayload, CopilotTestPayload, CopilotTestResult, CopilotTurnPayload,
};
use crate::{AppError, AppState};

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
