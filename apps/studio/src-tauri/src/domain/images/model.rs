use crate::domain::common::service::HasId;
use serde::{Deserialize, Serialize};

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
    #[serde(default = "crate::now_iso")]
    pub created_at: String,
    #[serde(default = "crate::now_iso")]
    pub updated_at: String,
}

impl HasId for Image {
    fn id(&self) -> &str {
        &self.id
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIdPayload {
    pub project_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageRangePayload {
    pub project_id: String,
    pub offset: Option<usize>,
    pub limit: Option<usize>,
}
