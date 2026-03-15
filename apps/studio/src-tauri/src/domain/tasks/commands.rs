use crate::domain::projects::model::EntityIdPayload;
use crate::domain::tasks::model::ProjectIdPayload;
use crate::{AppError, AppState};
use serde_json::Value;
use tauri::State;

#[tauri::command]
pub fn tasks_list(state: State<AppState>) -> Result<Value, AppError> {
    let tasks = state.task_service.list_tasks()?;
    let tasks_value = serde_json::to_value(tasks)?;
    Ok(tasks_value)
}

#[tauri::command]
pub fn tasks_list_by_project(
    state: State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Value, AppError> {
    let tasks = state.task_service.list_tasks_by_project(payload)?;
    let tasks_value = serde_json::to_value(tasks)?;
    Ok(tasks_value)
}

#[tauri::command]
pub fn tasks_get(state: State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
    let task = state.task_service.get_task(payload)?;
    let task_value = serde_json::to_value(task)?;
    Ok(task_value)
}

#[tauri::command]
pub fn tasks_save(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let task = state.task_service.save_task(&app, payload)?;
    let task_value = serde_json::to_value(task)?;
    Ok(task_value)
}

#[tauri::command]
pub fn tasks_delete(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: EntityIdPayload,
) -> Result<Value, AppError> {
    state.task_service.delete_task(&app, payload)
}
