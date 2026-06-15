//! Thin facade over the `vailabel-cloud` storage service.
//!
//! The OpenDAL provider wiring, batch-transfer policy, and object listing now
//! live in the `vailabel-cloud` crate (domain/application/infrastructure). This
//! file keeps the original free-function signatures so `commands.rs` is
//! unchanged, builds the application service with the keychain-backed secret
//! port, and bridges the crate's async use cases to the synchronous Tauri
//! commands via the Tauri runtime. Domain errors convert to `AppError` via the
//! `From` impl in `crate::composition`.

use std::sync::Arc;

use vailabel_cloud::application::{CloudStorageService, SecretStore};
use vailabel_cloud::contracts::{
    BatchResult, CloudBatchPayload, CloudConfigPayload, CloudListPayload, CloudObjectMeta,
    CloudObjectPayload, TestConnectionResult,
};
use vailabel_cloud::infrastructure::OpenDalFactory;
use vailabel_core::{DomainError, DomainResult};

use crate::AppError;

/// Adapts the binary's OS-keychain reader to the crate's [`SecretStore`] port,
/// so cloud secrets are resolved in the backend and never round-trip through the
/// frontend.
struct KeyringSecretStore;

impl SecretStore for KeyringSecretStore {
    fn get(&self, namespace: &str, key: &str) -> DomainResult<Option<String>> {
        crate::read_secret(namespace, key)
            .map_err(|error| DomainError::repository(error.to_string()))
    }
}

/// Construct the application service with the keychain-backed object-store
/// factory. Cheap: building the operator only happens when a use case runs.
fn service() -> CloudStorageService {
    CloudStorageService::new(Arc::new(OpenDalFactory::new(Arc::new(KeyringSecretStore))))
}

pub fn test_connection(payload: CloudConfigPayload) -> TestConnectionResult {
    tauri::async_runtime::block_on(service().test_connection(payload))
}

pub fn upload_files(payload: CloudBatchPayload) -> Result<BatchResult, AppError> {
    Ok(tauri::async_runtime::block_on(service().upload_files(payload))?)
}

pub fn download_files(payload: CloudBatchPayload) -> Result<BatchResult, AppError> {
    Ok(tauri::async_runtime::block_on(
        service().download_files(payload),
    )?)
}

pub fn delete_object(payload: CloudObjectPayload) -> Result<(), AppError> {
    Ok(tauri::async_runtime::block_on(
        service().delete_object(payload),
    )?)
}

pub fn list_objects(payload: CloudListPayload) -> Result<Vec<CloudObjectMeta>, AppError> {
    Ok(tauri::async_runtime::block_on(
        service().list_objects(payload),
    )?)
}
