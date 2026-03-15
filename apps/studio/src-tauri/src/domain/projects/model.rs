use crate::domain::common::service::HasId;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub project_type: String,
    pub status: String,
    pub settings: Value,
    pub metadata: Value,
    #[serde(default = "crate::now_iso")]
    pub created_at: String,
    #[serde(default = "crate::now_iso")]
    pub updated_at: String,
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
