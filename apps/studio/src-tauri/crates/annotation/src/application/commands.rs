//! Write-side commands for label classes.

use serde_json::Value;

/// Create-or-update a label class from a payload (id minted when absent).
pub struct SaveLabelCommand {
    pub payload: Value,
}

impl SaveLabelCommand {
    pub fn new(payload: Value) -> Self {
        Self { payload }
    }
}

/// Delete a label class by id.
pub struct DeleteLabelCommand {
    pub id: String,
}

impl DeleteLabelCommand {
    pub fn new(id: impl Into<String>) -> Self {
        Self { id: id.into() }
    }
}
