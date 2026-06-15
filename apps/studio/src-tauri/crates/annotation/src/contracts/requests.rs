//! Inbound request payloads for label commands.

use serde::Deserialize;

/// `{ "projectId": "..." }` — list a project's label classes.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIdPayload {
    pub project_id: String,
}
