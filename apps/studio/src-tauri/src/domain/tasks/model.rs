use crate::domain::common::service::HasId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub name: String,
    pub description: String,
    pub status: String,
    pub project_id: String,
    pub assigned_to: Option<String>,
    pub due_date: Option<String>,
    #[serde(default = "crate::now_iso")]
    pub created_at: String,
    #[serde(default = "crate::now_iso")]
    pub updated_at: String,
}

impl HasId for Task {
    fn id(&self) -> &str {
        &self.id
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIdPayload {
    pub project_id: String,
}
