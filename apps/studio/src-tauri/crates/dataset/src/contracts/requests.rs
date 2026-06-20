//! Inbound request payloads for image listings.

use serde::Deserialize;

/// `{ "projectId": "..." }` — list a project's items.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIdPayload {
    pub project_id: String,
}

/// `{ "projectId", "offset?", "limit?" }` — paginated item listing.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemRangePayload {
    pub project_id: String,
    pub offset: Option<usize>,
    pub limit: Option<usize>,
}

/// `{ "projectId", "offset?", "limit?", "search?" }` — one page of items plus the
/// search-aware total, for a server-driven pager / infinite scroll.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemPagePayload {
    pub project_id: String,
    pub offset: Option<usize>,
    pub limit: Option<usize>,
    pub search: Option<String>,
}
