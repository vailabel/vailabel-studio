//! Image IPC commands. Thin Tauri handlers over the `vailabel-dataset` image
//! application service (held in [`crate::AppState`]); no business logic here.

use serde_json::Value;
use tauri::State;
use vailabel_dataset::application::{
    DeleteImageCommand, GetImageQuery, ListImagesByProjectQuery, ListImagesRangeQuery,
    SaveImageCommand,
};
use vailabel_dataset::contracts::{ImageRangePayload, ProjectIdPayload};
use vailabel_project::contracts::EntityIdPayload;

use crate::{AppError, AppState};

#[tauri::command]
pub fn images_list_by_project(
    state: State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Value, AppError> {
    let images = state.image_service.list_by_project(ListImagesByProjectQuery {
        project_id: payload.project_id,
    })?;
    Ok(serde_json::to_value(images)?)
}

#[tauri::command]
pub fn images_list_range(
    state: State<AppState>,
    payload: ImageRangePayload,
) -> Result<Value, AppError> {
    let images = state.image_service.list_range(ListImagesRangeQuery {
        project_id: payload.project_id,
        offset: payload.offset,
        limit: payload.limit,
    })?;
    Ok(serde_json::to_value(images)?)
}

#[tauri::command]
pub fn images_get(state: State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
    let image = state.image_service.get(GetImageQuery::new(payload.id))?;
    Ok(serde_json::to_value(image)?)
}

#[tauri::command]
pub fn images_save(state: State<AppState>, payload: Value) -> Result<Value, AppError> {
    let image = state.image_service.save(SaveImageCommand::new(payload))?;
    Ok(serde_json::to_value(image)?)
}

#[tauri::command]
pub fn images_delete(state: State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
    Ok(state
        .image_service
        .delete(DeleteImageCommand::new(payload.id))?)
}
