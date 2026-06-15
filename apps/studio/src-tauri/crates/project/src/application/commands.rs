//! Write-side commands.

use serde_json::Value;

/// Create-or-update a project from a (possibly partial, id-optional) JSON
/// payload. A missing/empty `id` means "create" and the id is minted.
pub struct SaveProjectCommand {
    /// The incoming project payload (camelCase, as sent by the frontend).
    pub payload: Value,
}

impl SaveProjectCommand {
    /// Wrap a raw payload.
    pub fn new(payload: Value) -> Self {
        Self { payload }
    }
}

/// Delete a project by id.
pub struct DeleteProjectCommand {
    /// Id of the project to delete.
    pub id: String,
}

impl DeleteProjectCommand {
    /// Target a project id for deletion.
    pub fn new(id: impl Into<String>) -> Self {
        Self { id: id.into() }
    }
}
