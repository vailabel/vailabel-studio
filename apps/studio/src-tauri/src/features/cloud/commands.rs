use crate::features::cloud::model::{
    BatchResult, CloudBatchPayload, CloudConfigPayload, CloudListPayload, CloudObjectMeta,
    CloudObjectPayload, TestConnectionResult,
};
use crate::features::cloud::service;
use crate::AppError;

#[tauri::command]
pub fn cloud_test_connection(
    payload: CloudConfigPayload,
) -> Result<TestConnectionResult, AppError> {
    Ok(service::test_connection(payload))
}

#[tauri::command]
pub async fn cloud_upload_files(
    app: tauri::AppHandle,
    payload: CloudBatchPayload,
) -> Result<BatchResult, AppError> {
    // The transfer is blocking (sync OpenDAL via `block_on`); run it off the
    // async runtime so the main thread stays responsive and the per-file
    // `studio://activity` events stream while it runs.
    tauri::async_runtime::spawn_blocking(move || service::upload_files(&app, payload))
        .await
        .map_err(|e| AppError::Message(format!("Cloud upload task failed: {e}")))?
}

#[tauri::command]
pub async fn cloud_download_files(
    app: tauri::AppHandle,
    payload: CloudBatchPayload,
) -> Result<BatchResult, AppError> {
    tauri::async_runtime::spawn_blocking(move || service::download_files(&app, payload))
        .await
        .map_err(|e| AppError::Message(format!("Cloud download task failed: {e}")))?
}

#[tauri::command]
pub fn cloud_delete_object(payload: CloudObjectPayload) -> Result<(), AppError> {
    service::delete_object(payload)
}

#[tauri::command]
pub fn cloud_list_objects(payload: CloudListPayload) -> Result<Vec<CloudObjectMeta>, AppError> {
    service::list_objects(payload)
}
