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

use tauri::AppHandle;
use vailabel_cloud::application::{CloudStorageService, SecretStore};
use vailabel_cloud::contracts::{
    BatchResult, CloudBatchPayload, CloudConfigPayload, CloudListPayload, CloudObjectMeta,
    CloudObjectPayload, TestConnectionResult,
};
use vailabel_cloud::infrastructure::OpenDalFactory;
use vailabel_core::{DomainError, DomainResult};

use crate::{emit_activity, ActivityEvent, AppError};

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

/// Cloud-sync activity kind shared by both directions, so the indicator groups
/// uploads and downloads under one category.
const CLOUD_KIND: &str = "cloud-sync";

fn plural(n: usize) -> &'static str {
    if n == 1 {
        ""
    } else {
        "s"
    }
}

/// Emit the terminal activity snapshot for a finished batch: `done` (auto-
/// dismisses) when everything synced, `error` (sticky) when nothing did, and a
/// `done`-with-warning when it was partial.
fn emit_batch_done(app: &AppHandle, id: &str, title: &str, result: &BatchResult) {
    let ok = result.succeeded.len();
    let failed = result.failed.len();
    let event = if ok == 0 && failed > 0 {
        ActivityEvent::error(id, CLOUD_KIND, title).message(format!("{failed} file{} failed", plural(failed)))
    } else if failed > 0 {
        ActivityEvent::done(id, CLOUD_KIND, title).message(format!("{ok} synced, {failed} failed"))
    } else {
        ActivityEvent::done(id, CLOUD_KIND, title).message(format!("{ok} file{} synced", plural(ok)))
    };
    emit_activity(app, event);
}

pub fn upload_files(app: &AppHandle, payload: CloudBatchPayload) -> Result<BatchResult, AppError> {
    const ID: &str = "cloud-upload";
    const TITLE: &str = "Uploading to cloud";
    let total = payload.items.len();
    emit_activity(
        app,
        ActivityEvent::active(ID, CLOUD_KIND, TITLE)
            .message(format!("Uploading {total} file{}…", plural(total)))
            .items(0, total as u64),
    );
    let result = tauri::async_runtime::block_on(service().upload_files_reported(payload, &mut |p| {
        emit_activity(
            app,
            ActivityEvent::active(ID, CLOUD_KIND, TITLE)
                .message(format!("{} of {} uploaded", p.completed, p.total))
                .items(p.completed as u64, p.total as u64),
        );
    }))?;
    emit_batch_done(app, ID, TITLE, &result);
    Ok(result)
}

pub fn download_files(app: &AppHandle, payload: CloudBatchPayload) -> Result<BatchResult, AppError> {
    const ID: &str = "cloud-download";
    const TITLE: &str = "Downloading from cloud";
    let total = payload.items.len();
    emit_activity(
        app,
        ActivityEvent::active(ID, CLOUD_KIND, TITLE)
            .message(format!("Downloading {total} file{}…", plural(total)))
            .items(0, total as u64),
    );
    let result =
        tauri::async_runtime::block_on(service().download_files_reported(payload, &mut |p| {
            emit_activity(
                app,
                ActivityEvent::active(ID, CLOUD_KIND, TITLE)
                    .message(format!("{} of {} downloaded", p.completed, p.total))
                    .items(p.completed as u64, p.total as u64),
            );
        }))?;
    emit_batch_done(app, ID, TITLE, &result);
    Ok(result)
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
