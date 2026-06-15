//! Write-side commands for images.

use serde_json::Value;

/// Create-or-update an image from a payload (id minted when absent).
pub struct SaveImageCommand {
    pub payload: Value,
}

impl SaveImageCommand {
    pub fn new(payload: Value) -> Self {
        Self { payload }
    }
}

/// Delete an image by id.
pub struct DeleteImageCommand {
    pub id: String,
}

impl DeleteImageCommand {
    pub fn new(id: impl Into<String>) -> Self {
        Self { id: id.into() }
    }
}
