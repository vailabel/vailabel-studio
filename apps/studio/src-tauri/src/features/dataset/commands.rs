//! Dataset IPC commands — thin handlers over the `vailabel-dataset` image
//! application service and the local [`super::service::DatasetService`] (YOLO
//! import/export). No business logic here.

use serde_json::Value;
use tauri::State;
use vailabel_dataset::application::{
    DeleteImageCommand, GetImageQuery, ListImagesByProjectQuery, ListImagesRangeQuery,
    SaveImageCommand,
};
use vailabel_dataset::contracts::{ImageRangePayload, ProjectIdPayload};
use vailabel_project::contracts::EntityIdPayload;

use super::service::{
    DatasetExportPayload, DatasetExportResult, DatasetImportPayload, DatasetImportResult,
};
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

#[tauri::command]
pub async fn dataset_export_yolo(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: DatasetExportPayload,
) -> Result<DatasetExportResult, AppError> {
    state.dataset_service.export_yolo(&app, payload)
}

#[tauri::command]
pub async fn dataset_import_yolo(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: DatasetImportPayload,
) -> Result<DatasetImportResult, AppError> {
    state.dataset_service.import_yolo(&app, payload)
}
