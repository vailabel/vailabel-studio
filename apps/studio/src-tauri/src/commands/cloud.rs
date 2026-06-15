use crate::cloud::model::{
    BatchResult, CloudBatchPayload, CloudConfigPayload, CloudListPayload, CloudObjectMeta,
    CloudObjectPayload, TestConnectionResult,
};
use crate::cloud::service;
use crate::AppError;

#[tauri::command]
pub fn cloud_test_connection(
    payload: CloudConfigPayload,
) -> Result<TestConnectionResult, AppError> {
    Ok(service::test_connection(payload))
}

#[tauri::command]
pub fn cloud_upload_files(payload: CloudBatchPayload) -> Result<BatchResult, AppError> {
    service::upload_files(payload)
}

#[tauri::command]
pub fn cloud_download_files(payload: CloudBatchPayload) -> Result<BatchResult, AppError> {
    service::download_files(payload)
}

#[tauri::command]
pub fn cloud_delete_object(payload: CloudObjectPayload) -> Result<(), AppError> {
    service::delete_object(payload)
}

#[tauri::command]
pub fn cloud_list_objects(payload: CloudListPayload) -> Result<Vec<CloudObjectMeta>, AppError> {
    service::list_objects(payload)
}
