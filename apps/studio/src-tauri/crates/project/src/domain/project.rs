//! The `Project` aggregate root.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use vailabel_core::{AggregateRoot, Entity, Identifiable};

/// A labeling project — the top-level container an annotator works within.
///
/// The serde shape (camelCase, the `type` rename, the `settings`/`metadata`
/// JSON blobs, and the timestamp defaults) is identical to the binary's
/// historical `Project` so existing stored rows and IPC payloads round-trip
/// unchanged. The only change from the move is that the timestamp defaults now
/// resolve `vailabel_shared::now_iso` instead of the binary's `crate::now_iso`
/// (same implementation: `chrono::Utc::now().to_rfc3339()`).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub project_type: String,
    /// Coarse data type of the project's items: image | video | text | audio.
    #[serde(default = "default_modality")]
    pub modality: String,
    /// Labeling task within the modality: detection | segmentation |
    /// classification | keypoints | ner | ...
    #[serde(default = "default_task")]
    pub task: String,
    pub status: String,
    pub settings: Value,
    pub metadata: Value,
    #[serde(default = "vailabel_shared::now_iso")]
    pub created_at: String,
    #[serde(default = "vailabel_shared::now_iso")]
    pub updated_at: String,
    /// Number of images in the project. Derived by the list/get queries from the
    /// images table — it is not a stored column. Defaults to 0 (e.g. on the
    /// create/update round-trip, where the real count comes from a later list).
    #[serde(default)]
    pub image_count: i64,
}

fn default_modality() -> String {
    "image".to_string()
}

fn default_task() -> String {
    "detection".to_string()
}

impl Identifiable for Project {
    fn id(&self) -> &str {
        &self.id
    }
}

impl Entity for Project {}
impl AggregateRoot for Project {}
