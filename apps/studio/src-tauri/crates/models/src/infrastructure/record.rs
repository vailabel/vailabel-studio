//! Persistence records for the managed-model aggregates and their mapping
//! to/from the domain types.

use diesel::prelude::*;
use serde_json::Value;

use super::schema::{ai_models, runtime_models};
use crate::domain::{AiModel, RuntimeModel};

/// Serialize an optional JSON blob column (`None` when the value is null).
fn json_or_none(value: &Value) -> Option<String> {
    if value.is_null() {
        None
    } else {
        Some(value.to_string())
    }
}

/// Parse an optional JSON blob column, falling back to JSON null.
fn parse_or_null(stored: Option<&str>) -> Value {
    stored
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or(Value::Null)
}

/// The `ai_models` table row.
#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = ai_models)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct AiModelRow {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub project_id: Option<String>,
    pub model_path: String,
    pub config_path: String,
    pub model_size: i32,
    pub is_custom: i32,
    pub model_type: String,
    pub status: String,
    pub category: Option<String>,
    pub is_active: i32,
    pub last_used: Option<String>,
    pub backend: Option<String>,
    pub framework: Option<String>,
    pub labels_path: Option<String>,
    pub stride: Option<i32>,
    pub family: Option<String>,
    pub variant: Option<String>,
    pub default_rank: Option<i32>,
    pub supports_label_studio_format: i32,
    pub task_type: Option<String>,
    pub model_version: Option<String>,
    pub metadata_json: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl AiModelRow {
    pub fn from_model(model: &AiModel, now: &str) -> Self {
        Self {
            id: model.id.clone(),
            name: model.name.clone(),
            description: model.description.clone(),
            version: if model.version.is_empty() {
                "1.0.0".to_string()
            } else {
                model.version.clone()
            },
            project_id: model.project_id.clone(),
            model_path: model.model_path.clone(),
            config_path: model.config_path.clone(),
            model_size: model.model_size,
            is_custom: i32::from(model.is_custom),
            model_type: if model.model_type.is_empty() {
                "detection".to_string()
            } else {
                model.model_type.clone()
            },
            status: if model.status.is_empty() {
                "inactive".to_string()
            } else {
                model.status.clone()
            },
            category: model.category.clone(),
            is_active: i32::from(model.is_active),
            last_used: model.last_used.clone(),
            backend: model.backend.clone(),
            framework: model.framework.clone(),
            labels_path: model.labels_path.clone(),
            stride: model.stride,
            family: model.family.clone(),
            variant: model.variant.clone(),
            default_rank: model.default_rank,
            supports_label_studio_format: i32::from(model.supports_label_studio_format),
            task_type: model.task_type.clone(),
            model_version: model.model_version.clone(),
            metadata_json: json_or_none(&model.metadata),
            created_at: if model.created_at.is_empty() {
                now.to_string()
            } else {
                model.created_at.clone()
            },
            updated_at: now.to_string(),
        }
    }

    pub fn into_model(self) -> AiModel {
        AiModel {
            id: self.id,
            name: self.name,
            description: self.description,
            version: self.version,
            project_id: self.project_id,
            model_path: self.model_path,
            config_path: self.config_path,
            model_size: self.model_size,
            is_custom: self.is_custom != 0,
            model_type: self.model_type,
            status: self.status,
            category: self.category,
            is_active: self.is_active != 0,
            last_used: self.last_used,
            backend: self.backend,
            framework: self.framework,
            labels_path: self.labels_path,
            stride: self.stride,
            family: self.family,
            variant: self.variant,
            default_rank: self.default_rank,
            supports_label_studio_format: self.supports_label_studio_format != 0,
            task_type: self.task_type,
            model_version: self.model_version,
            metadata: parse_or_null(self.metadata_json.as_deref()),
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

/// The `runtime_models` table row. `size` is a 64-bit byte count (`BigInt`).
#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = runtime_models)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct RuntimeModelRow {
    pub id: String,
    pub name: String,
    pub family: String,
    pub version: String,
    pub size: i64,
    pub download_url: Option<String>,
    pub local_path: Option<String>,
    pub sha256: Option<String>,
    pub status: String,
    pub capabilities_json: Option<String>,
    pub installed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl RuntimeModelRow {
    pub fn from_model(model: &RuntimeModel, now: &str) -> Self {
        Self {
            id: model.id.clone(),
            name: model.name.clone(),
            family: model.family.clone(),
            version: model.version.clone(),
            size: model.size,
            download_url: model.download_url.clone(),
            local_path: model.local_path.clone(),
            sha256: model.sha256.clone(),
            status: if model.status.is_empty() {
                "available".to_string()
            } else {
                model.status.clone()
            },
            capabilities_json: json_or_none(&model.capabilities),
            installed_at: model.installed_at.clone(),
            created_at: if model.created_at.is_empty() {
                now.to_string()
            } else {
                model.created_at.clone()
            },
            updated_at: now.to_string(),
        }
    }

    pub fn into_model(self) -> RuntimeModel {
        RuntimeModel {
            id: self.id,
            name: self.name,
            family: self.family,
            version: self.version,
            size: self.size,
            download_url: self.download_url,
            local_path: self.local_path,
            sha256: self.sha256,
            status: self.status,
            capabilities: parse_or_null(self.capabilities_json.as_deref()),
            installed_at: self.installed_at,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}
