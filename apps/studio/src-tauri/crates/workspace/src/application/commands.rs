//! Write-side commands for the workspace aggregates.

use serde_json::Value;

/// Create-or-update a setting from a payload (id minted when absent, upserted by
/// its unique `key`).
pub struct SaveSettingCommand {
    pub payload: Value,
}

impl SaveSettingCommand {
    pub fn new(payload: Value) -> Self {
        Self { payload }
    }
}

/// Create-or-update a history snapshot from a payload (id minted when absent).
pub struct SaveHistoryCommand {
    pub payload: Value,
}

impl SaveHistoryCommand {
    pub fn new(payload: Value) -> Self {
        Self { payload }
    }
}
