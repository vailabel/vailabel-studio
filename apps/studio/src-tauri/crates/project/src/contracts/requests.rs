//! Inbound request payloads (mirror the existing camelCase IPC shapes).

use serde::Deserialize;

/// `{ "id": "..." }` — identifies an entity by its id. Used by get/delete.
#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EntityIdPayload {
    pub id: String,
}

/// `{ "projectId": "..." }` — identifies a project (e.g. for child-entity
/// listings keyed by project).
#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIdPayload {
    pub project_id: String,
}
