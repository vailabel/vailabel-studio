//! The `Image` asset entity.

use serde::{Deserialize, Serialize};
use vailabel_core::{Entity, Identifiable};

/// A single image asset belonging to a project/dataset. Serde shape is
/// identical to the binary's historical `Image`; the timestamp defaults now
/// resolve `vailabel_shared::now_iso` (same `chrono::Utc::now().to_rfc3339()`).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Image {
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
    #[serde(default = "vailabel_shared::now_iso")]
    pub created_at: String,
    #[serde(default = "vailabel_shared::now_iso")]
    pub updated_at: String,
}

impl Identifiable for Image {
    fn id(&self) -> &str {
        &self.id
    }
}

impl Entity for Image {}
