//! Request/response DTOs the Tauri cloud commands serialize. Pure data — the
//! `config` blob holds only non-secret fields; secret material is resolved from
//! the OS keychain by `config_id` (see [`crate::application::SecretStore`]).

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// A saved cloud configuration as seen by the backend. `config` holds only the
/// non-secret fields (bucket/region/accountName/container); secret material is
/// read from the OS keychain by `config_id`, never passed through here.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudConfigPayload {
    pub config_id: String,
    pub provider: String,
    pub config: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTransferItem {
    /// Object key in the bucket (always forward-slash separated).
    pub key: String,
    /// Absolute local file path (upload source / download destination).
    pub path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudBatchPayload {
    pub config_id: String,
    pub provider: String,
    pub config: Value,
    pub items: Vec<FileTransferItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudObjectPayload {
    pub config_id: String,
    pub provider: String,
    pub config: Value,
    pub key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudListPayload {
    pub config_id: String,
    pub provider: String,
    pub config: Value,
    pub prefix: Option<String>,
    pub limit: Option<usize>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestConnectionResult {
    pub ok: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferFailure {
    pub key: String,
    pub error: String,
}

/// Result of a batch upload/download. Transfers never fail-fast: every item is
/// attempted and successes/failures are reported separately so the UI can show
/// "N synced, M failed".
#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchResult {
    pub succeeded: Vec<String>,
    pub failed: Vec<TransferFailure>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudObjectMeta {
    pub key: String,
    pub size: u64,
    pub last_modified: Option<String>,
}
