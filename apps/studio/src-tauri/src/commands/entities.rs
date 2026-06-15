//! IPC commands for the JSON-blob entities (annotations / history / settings)
//! that still go through the residual `DesktopStore`. Thin Tauri handlers; the
//! persistence + event plumbing live in `lib.rs` (the composition shell) pending
//! their own crate extraction.

use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    delete_entity_for, emit_domain_event, list_by_image_for, list_by_project_for,
    list_entities_for, normalize_entity, save_entity_for, state_guard, value_string, AppError,
    AppState,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIdPayload {
    pub project_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageIdPayload {
    pub image_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityIdPayload {
    pub id: String,
}

#[tauri::command]
pub fn annotations_list_by_project(
    state: tauri::State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Vec<Value>, AppError> {
    list_by_project_for(&state, "annotations", &payload.project_id)
}

#[tauri::command]
pub fn annotations_list_by_image(
    state: tauri::State<AppState>,
    payload: ImageIdPayload,
) -> Result<Vec<Value>, AppError> {
    list_by_image_for(&state, "annotations", &payload.image_id)
}

#[tauri::command]
pub fn annotations_save(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    save_entity_for(&app, &state, "annotations", "annotations", payload)
}

#[tauri::command]
pub fn annotations_delete(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    payload: EntityIdPayload,
) -> Result<Value, AppError> {
    delete_entity_for(
        &app,
        &state,
        "annotations",
        "annotations",
        &payload.id,
        "Annotation not found",
    )
}

#[tauri::command]
pub fn history_list_by_project(
    state: tauri::State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Vec<Value>, AppError> {
    list_by_project_for(&state, "history", &payload.project_id)
}

#[tauri::command]
pub fn history_save(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    save_entity_for(&app, &state, "history", "history", payload)
}

#[tauri::command]
pub fn settings_list(state: tauri::State<AppState>) -> Result<Vec<Value>, AppError> {
    list_entities_for(&state, "settings")
}

#[tauri::command]
pub fn settings_get(
    state: tauri::State<AppState>,
    payload: EntityIdPayload,
) -> Result<Value, AppError> {
    let store = state_guard(&state)?;
    Ok(store.get_setting(&payload.id)?.unwrap_or_else(
        || json!({ "id": Uuid::new_v4().to_string(), "key": payload.id, "value": "" }),
    ))
}

#[tauri::command]
pub fn settings_set(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let key = value_string(&payload, "key", "key").unwrap_or_default();
    let store = state_guard(&state)?;
    let action = if !key.is_empty() && store.get_setting(&key)?.is_some() {
        "updated"
    } else {
        "created"
    };
    let value = store.upsert_setting(normalize_entity("settings", payload)?)?;
    emit_domain_event(&app, "settings", action, &value)?;
    Ok(value)
}
