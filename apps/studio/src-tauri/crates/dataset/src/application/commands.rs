//! Write-side commands for items.

use serde_json::Value;

/// Create-or-update an image from a payload (id minted when absent).
pub struct SaveItemCommand {
    pub payload: Value,
}

impl SaveItemCommand {
    pub fn new(payload: Value) -> Self {
        Self { payload }
    }
}

/// Delete an image by id.
pub struct DeleteItemCommand {
    pub id: String,
}

impl DeleteItemCommand {
    pub fn new(id: impl Into<String>) -> Self {
        Self { id: id.into() }
    }
}
