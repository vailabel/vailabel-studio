use crate::domain::projects::model::EntityIdPayload;
use crate::{AppState, AppError};
use serde_json::Value;
use tauri::State;

#[tauri::command]
pub fn projects_list(state: State<AppState>) -> Result<Value, AppError> {
    let projects = state.project_service.list_projects()?;
    let projects_value = serde_json::to_value(projects)?;
    Ok(projects_value)
}

#[tauri::command]
pub fn projects_get(state: State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
    let project = state.project_service.get_project(payload)?;
    let project_value = serde_json::to_value(project)?;
    Ok(project_value)
}

#[tauri::command]
pub fn projects_save(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let project = state.project_service.save_project(&app, payload)?;
    let project_value = serde_json::to_value(project)?;
    Ok(project_value)
}

#[tauri::command]
pub fn projects_delete(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: EntityIdPayload,
) -> Result<Value, AppError> {
    state.project_service.delete_project(&app, payload)
}
