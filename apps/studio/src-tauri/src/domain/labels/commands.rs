use crate::domain::labels::model::ProjectIdPayload;
use crate::{AppState, AppError};
use serde_json::Value;
use tauri::State;
use crate::domain::projects::model::EntityIdPayload;

#[tauri::command]
pub fn labels_list_by_project(state: State<AppState>, payload: ProjectIdPayload) -> Result<Value, AppError> {
    let labels = state.label_service.list_labels_by_project(payload)?;
    let labels_value = serde_json::to_value(labels)?;
    Ok(labels_value)
}

#[tauri::command]
pub fn labels_save(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let label = state.label_service.save_label(&app, payload)?;
    let label_value = serde_json::to_value(label)?;
    Ok(label_value)
}

#[tauri::command]
pub fn labels_delete(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: EntityIdPayload,
) -> Result<Value, AppError> {
    state.label_service.delete_label(&app, payload)
}
