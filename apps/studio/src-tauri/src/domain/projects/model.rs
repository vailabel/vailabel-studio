use crate::domain::common::service::HasId;
use serde::{Deserialize, Serialize};
use serde_json::Value;

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
    #[serde(default = "crate::now_iso")]
    pub created_at: String,
    #[serde(default = "crate::now_iso")]
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

impl HasId for Project {
    fn id(&self) -> &str {
        &self.id
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIdPayload {
    pub project_id: String,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EntityIdPayload {
    pub id: String,
}
