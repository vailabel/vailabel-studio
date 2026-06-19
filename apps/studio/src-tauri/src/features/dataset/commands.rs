//! Dataset IPC commands — thin handlers over the `vailabel-dataset` image
//! application service and the local [`super::service::DatasetService`] (YOLO
//! import/export). No business logic here.

use serde_json::Value;
use tauri::State;
use vailabel_dataset::application::{
    DeleteItemCommand, GetItemQuery, ListItemsByProjectQuery, ListItemsRangeQuery,
    SaveItemCommand,
};
use vailabel_dataset::contracts::{ItemRangePayload, ProjectIdPayload};
use vailabel_project::contracts::EntityIdPayload;

use super::service::{
    DatasetExportPayload, DatasetExportResult, DatasetImportPayload, DatasetImportResult,
};
use super::spreadsheet::{parse_spreadsheet, SpreadsheetData};
use crate::{AppError, AppState};

#[tauri::command]
pub fn items_list_by_project(
    state: State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Value, AppError> {
    let images = state.item_service.list_by_project(ListItemsByProjectQuery {
        project_id: payload.project_id,
    })?;
    Ok(serde_json::to_value(images)?)
}

#[tauri::command]
pub fn items_list_range(
    state: State<AppState>,
    payload: ItemRangePayload,
) -> Result<Value, AppError> {
    let images = state.item_service.list_range(ListItemsRangeQuery {
        project_id: payload.project_id,
        offset: payload.offset,
        limit: payload.limit,
    })?;
    Ok(serde_json::to_value(images)?)
}

#[tauri::command]
pub fn items_get(state: State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
    let image = state.item_service.get(GetItemQuery::new(payload.id))?;
    Ok(serde_json::to_value(image)?)
}

#[tauri::command]
pub fn items_save(state: State<AppState>, payload: Value) -> Result<Value, AppError> {
    let image = state.item_service.save(SaveItemCommand::new(payload))?;
    Ok(serde_json::to_value(image)?)
}

#[tauri::command]
pub fn items_delete(state: State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
    Ok(state
        .item_service
        .delete(DeleteItemCommand::new(payload.id))?)
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

/// Parse a CSV / TSV / Excel file into `{ headers, rows }` for the structured-data
/// import flow. Pure file read — no DB access — so it takes no `AppState`.
#[tauri::command]
pub fn spreadsheet_parse(path: String) -> Result<SpreadsheetData, AppError> {
    parse_spreadsheet(&path)
}
