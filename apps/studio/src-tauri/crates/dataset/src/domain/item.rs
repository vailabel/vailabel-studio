//! The `Item` asset entity.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use vailabel_core::{Entity, Identifiable};

/// A single image asset belonging to a project/dataset. Serde shape is
/// identical to the binary's historical `Item`; the timestamp defaults now
/// resolve `vailabel_shared::now_iso` (same `chrono::Utc::now().to_rfc3339()`).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    #[serde(default = "vailabel_shared::new_id")]
    pub id: String,
    pub name: String,
    /// Absolute on-disk path to the referenced image file (never base64).
    pub path: String,
    /// Path relative to the opened folder, used for LabelMe JSON sidecars.
    #[serde(default)]
    pub image_path: Option<String>,
    pub project_id: String,
    pub width: u32,
    pub height: u32,
    /// Inline task data for non-file items (a spreadsheet row's column values as
    /// a JSON object). `None` for file-backed assets (items, audio, text), so
    /// their serialized shape is unchanged.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
    #[serde(default = "vailabel_shared::now_iso")]
    pub created_at: String,
    #[serde(default = "vailabel_shared::now_iso")]
    pub updated_at: String,
}

impl Identifiable for Item {
    fn id(&self) -> &str {
        &self.id
    }
}

impl Entity for Item {}
