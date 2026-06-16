//! Persistence records for the workspace aggregates and their mapping to/from
//! the domain types.

use diesel::prelude::*;
use serde_json::Value;

use super::schema::{history, secret_keys, settings};
use crate::domain::{History, Setting};

/// The `settings` table row.
#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = settings)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct SettingRow {
    pub id: String,
    pub key: String,
    pub value: String,
    pub created_at: String,
    pub updated_at: String,
}

impl SettingRow {
    /// Build a row for insert/update: `updated_at` refreshed to `now`,
    /// `created_at` preserved (or `now` when absent).
    pub fn from_setting(setting: &Setting, now: &str) -> Self {
        Self {
            id: setting.id.clone(),
            key: setting.key.clone(),
            value: setting.value.clone(),
            created_at: if setting.created_at.is_empty() {
                now.to_string()
            } else {
                setting.created_at.clone()
            },
            updated_at: now.to_string(),
        }
    }

    pub fn into_setting(self) -> Setting {
        Setting {
            id: self.id,
            key: self.key,
            value: self.value,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

/// The `history` table row. `labels_json` holds the serialized history stack;
/// `can_undo`/`can_redo` are 0/1 integers.
#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = history)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct HistoryRow {
    pub id: String,
    pub project_id: Option<String>,
    pub labels_json: Option<String>,
    pub history_index: i32,
    pub can_undo: i32,
    pub can_redo: i32,
    pub created_at: String,
    pub updated_at: String,
}

impl HistoryRow {
    pub fn from_history(history: &History, now: &str) -> Self {
        let labels_json = if history.labels.is_null() {
            None
        } else {
            Some(history.labels.to_string())
        };
        Self {
            id: history.id.clone(),
            project_id: history.project_id.clone(),
            labels_json,
            history_index: history.history_index,
            can_undo: history.can_undo as i32,
            can_redo: history.can_redo as i32,
            created_at: if history.created_at.is_empty() {
                now.to_string()
            } else {
                history.created_at.clone()
            },
            updated_at: now.to_string(),
        }
    }

    pub fn into_history(self) -> History {
        let labels = self
            .labels_json
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or_else(|| Value::Array(Vec::new()));
        History {
            id: self.id,
            project_id: self.project_id,
            labels,
            history_index: self.history_index,
            can_undo: self.can_undo != 0,
            can_redo: self.can_redo != 0,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

/// The `secret_keys` registry row (a keychain entry name; no secret value, no
/// timestamps).
#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = secret_keys)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct SecretKeyRow {
    pub id: String,
    pub namespace: String,
    pub name: String,
}
