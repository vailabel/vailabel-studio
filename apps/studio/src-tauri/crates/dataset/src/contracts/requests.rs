//! Inbound request payloads for image listings.

use serde::Deserialize;

/// `{ "projectId": "..." }` — list a project's items.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIdPayload {
    pub project_id: String,
}

/// `{ "projectId", "offset?", "limit?" }` — paginated image listing.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemRangePayload {
    pub project_id: String,
    pub offset: Option<usize>,
    pub limit: Option<usize>,
}
