//! Workspace IPC commands (settings / history / keychain secrets) — thin handlers
//! over the `vailabel-workspace` services in [`crate::AppState`] + the shared
//! keychain helpers.

use serde::Deserialize;
use serde_json::{json, Value};
use tauri::State;
use uuid::Uuid;
use vailabel_project::contracts::{EntityIdPayload, ProjectIdPayload};
use vailabel_workspace::application::{
    GetSettingQuery, ListHistoryByProjectQuery, SaveHistoryCommand, SaveSettingCommand,
};

use crate::shared::secrets::keyring_entry;
use crate::{read_secret, AppError, AppState};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretSetPayload {
    namespace: String,
    key: String,
    value: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretPayload {
    namespace: String,
    key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretListPayload {
    namespace: String,
}

/// Serialize a list of domain entities into the `Vec<Value>` shape the IPC
/// boundary returns.
fn to_values<T: serde::Serialize>(items: Vec<T>) -> Result<Vec<Value>, AppError> {
    items
        .into_iter()
        .map(|item| serde_json::to_value(item).map_err(AppError::from))
        .collect()
}

// ───────────────────────────── History ─────────────────────────────

#[tauri::command]
pub fn history_list_by_project(
    state: State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Vec<Value>, AppError> {
    let items = state
        .history_service
        .list_by_project(ListHistoryByProjectQuery::new(payload.project_id))?;
    to_values(items)
}

#[tauri::command]
pub fn history_save(state: State<AppState>, payload: Value) -> Result<Value, AppError> {
    let saved = state.history_service.save(SaveHistoryCommand::new(payload))?;
    Ok(serde_json::to_value(saved)?)
}

// ───────────────────────────── Settings ────────────────────────────

#[tauri::command]
pub fn settings_list(state: State<AppState>) -> Result<Vec<Value>, AppError> {
    let items = state.settings_service.list()?;
    to_values(items)
}

#[tauri::command]
pub fn settings_get(state: State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
    match state
        .settings_service
        .get(GetSettingQuery::new(payload.id.clone()))?
    {
        Some(setting) => Ok(serde_json::to_value(setting)?),
        None => Ok(json!({ "id": Uuid::new_v4().to_string(), "key": payload.id, "value": "" })),
    }
}

#[tauri::command]
pub fn settings_set(state: State<AppState>, payload: Value) -> Result<Value, AppError> {
    let saved = state.settings_service.set(SaveSettingCommand::new(payload))?;
    Ok(serde_json::to_value(saved)?)
}

// ────────────────────────── Keychain secrets ───────────────────────

#[tauri::command]
pub fn secret_set(state: State<AppState>, payload: SecretSetPayload) -> Result<(), AppError> {
    keyring_entry(&payload.namespace, &payload.key)?.set_password(&payload.value)?;
    state
        .secret_key_service
        .register(&payload.namespace, &payload.key)?;
    Ok(())
}

#[tauri::command]
pub fn secret_get(payload: SecretPayload) -> Result<Option<String>, AppError> {
    read_secret(&payload.namespace, &payload.key)
}

#[tauri::command]
pub fn secret_delete(state: State<AppState>, payload: SecretPayload) -> Result<(), AppError> {
    let entry = keyring_entry(&payload.namespace, &payload.key)?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => {}
        Err(error) => return Err(AppError::Keyring(error)),
    }
    state
        .secret_key_service
        .unregister(&payload.namespace, &payload.key)?;
    Ok(())
}

#[tauri::command]
pub fn secret_list(
    state: State<AppState>,
    payload: SecretListPayload,
) -> Result<Vec<String>, AppError> {
    Ok(state.secret_key_service.list(&payload.namespace)?)
}
