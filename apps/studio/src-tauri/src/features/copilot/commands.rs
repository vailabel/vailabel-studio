//! AI copilot IPC commands — thin handlers over the [`CopilotBridge`] (held in
//! [`crate::AppState`]) and the `AiService` apply-action path. The copilot's
//! brain runs in the Python runtime; the bridge gathers context, calls it, and
//! persists the prediction drafts it returns.

use serde_json::Value;
use tauri::State;

use crate::features::ai::model::{
    CopilotActionPayload, CopilotTestPayload, CopilotTestResult, CopilotTurnPayload,
};
use crate::features::copilot::types::CopilotTurnResult;
use crate::{AppError, AppState};

/// Local AI copilot: one chat turn. Runs on a blocking thread because the bridge
/// does synchronous runtime HTTP + persistence. The bridge persists any returned
/// prediction drafts and emits `predictions:generated` exactly as before.
#[tauri::command]
pub async fn ai_copilot_turn(
    state: State<'_, AppState>,
    payload: CopilotTurnPayload,
) -> Result<CopilotTurnResult, AppError> {
    let copilot_service = state.copilot_service.clone();

    tauri::async_runtime::spawn_blocking(move || copilot_service.turn(payload))
        .await
        .map_err(|error| AppError::Message(format!("AI copilot task failed: {error}")))?
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
