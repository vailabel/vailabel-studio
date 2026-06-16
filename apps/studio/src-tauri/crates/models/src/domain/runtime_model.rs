//! The `RuntimeModel` aggregate — a downloadable weight in the embedded-runtime
//! Model Manager registry.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use vailabel_core::{Entity, Identifiable};

use super::wire::with_snake_aliases;

/// A model the embedded Python runtime can download/install. `size` is a 64-bit
/// byte count (checkpoints can be multi-GB). `capabilities` is an opaque JSON
/// array. [`RuntimeModel::to_value`] re-emits the snake_case aliases (and the
/// `capabilities_json` mirror) that `runtime_model_to_json` produced.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeModel {
    pub id: String,
    // `name`/`family` default so a partial status-only upsert (e.g. the installer
    // marking a download as "error") deserializes; this matches the residual
    // store, which filled missing string columns with "".
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub family: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub size: i64,
    #[serde(default)]
    pub download_url: Option<String>,
    #[serde(default)]
    pub local_path: Option<String>,
    #[serde(default)]
    pub sha256: Option<String>,
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(default = "empty_array")]
    pub capabilities: Value,
    #[serde(default)]
    pub installed_at: Option<String>,
    #[serde(default = "vailabel_shared::now_iso")]
    pub created_at: String,
    #[serde(default = "vailabel_shared::now_iso")]
    pub updated_at: String,
}

/// camelCase keys mirrored to their snake_case alias on output (matches
/// `runtime_model_to_json`, including the `capabilities` → `capabilities_json`
/// mirror).
const SNAKE_ALIASES: &[(&str, &str)] = &[
    ("downloadUrl", "download_url"),
    ("localPath", "local_path"),
    ("capabilities", "capabilities_json"),
    ("installedAt", "installed_at"),
    ("createdAt", "created_at"),
    ("updatedAt", "updated_at"),
];

impl RuntimeModel {
    /// The dual-key JSON wire form (camelCase + snake_case aliases), matching the
    /// residual store's `runtime_model_to_json` output.
    pub fn to_value(&self) -> Value {
        let value = serde_json::to_value(self).unwrap_or(Value::Null);
        with_snake_aliases(value, SNAKE_ALIASES)
    }
}

fn default_status() -> String {
    "available".to_string()
}
fn empty_array() -> Value {
    json!([])
}

impl Identifiable for RuntimeModel {
    fn id(&self) -> &str {
        &self.id
    }
}

impl Entity for RuntimeModel {}
