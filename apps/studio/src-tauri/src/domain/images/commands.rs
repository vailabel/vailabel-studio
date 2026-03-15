use crate::domain::images::model::{ProjectIdPayload, ImageRangePayload};
use crate::{AppState, AppError};
use serde_json::Value;
use tauri::State;
use crate::domain::projects::model::EntityIdPayload;

#[tauri::command]
pub fn images_list_by_project(state: State<AppState>, payload: ProjectIdPayload) -> Result<Value, AppError> {
    let images = state.image_service.list_images_by_project(payload)?;
    let images_value = serde_json::to_value(images)?;
    Ok(images_value)
}

#[tauri::command]
pub fn images_list_range(state: State<AppState>, payload: ImageRangePayload) -> Result<Value, AppError> {
    let images = state.image_service.list_images_range(payload)?;
    let images_value = serde_json::to_value(images)?;
    Ok(images_value)
}

#[tauri::command]
pub fn images_get(state: State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
    let image = state.image_service.get_image(payload)?;
    let image_value = serde_json::to_value(image)?;
    Ok(image_value)
}

#[tauri::command]
pub fn images_save(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let image = state.image_service.save_image(&app, payload)?;
    let image_value = serde_json::to_value(image)?;
    Ok(image_value)
}

#[tauri::command]
pub fn images_delete(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: EntityIdPayload,
) -> Result<Value, AppError> {
    state.image_service.delete_image(&app, payload)
}
