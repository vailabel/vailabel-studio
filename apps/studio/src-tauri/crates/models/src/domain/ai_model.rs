//! The `AiModel` aggregate — a managed AI model in the catalog.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use vailabel_core::{AggregateRoot, Entity, Identifiable};

use super::wire::with_snake_aliases;

/// A managed AI model. The serde shape matches the frontend model: camelCase
/// with `model_type` serialized as `type` and `metadata` as `modelMetadata`.
/// Field defaults reproduce the residual store's `normalize_entity("ai_models")`
/// seeding so a partial save fills the same values. [`AiModel::to_value`] re-emits
/// the snake_case aliases the store's `ai_model_to_json` produced.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiModel {
    #[serde(default = "vailabel_shared::new_id")]
    pub id: String,
    #[serde(default = "default_name")]
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_version")]
    pub version: String,
    #[serde(default)]
    pub project_id: Option<String>,
    #[serde(default)]
    pub model_path: String,
    #[serde(default)]
    pub config_path: String,
    #[serde(default)]
    pub model_size: i32,
    #[serde(default = "default_true")]
    pub is_custom: bool,
    #[serde(rename = "type", default = "default_model_type")]
    pub model_type: String,
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(default = "default_category")]
    pub category: Option<String>,
    #[serde(default)]
    pub is_active: bool,
    #[serde(default)]
    pub last_used: Option<String>,
    #[serde(default = "default_backend")]
    pub backend: Option<String>,
    #[serde(default = "default_framework")]
    pub framework: Option<String>,
    #[serde(default)]
    pub labels_path: Option<String>,
    #[serde(default)]
    pub stride: Option<i32>,
    #[serde(default)]
    pub family: Option<String>,
    #[serde(default)]
    pub variant: Option<String>,
    #[serde(default = "default_rank")]
    pub default_rank: Option<i32>,
    #[serde(default)]
    pub supports_label_studio_format: bool,
    #[serde(default = "default_task_type")]
    pub task_type: Option<String>,
    #[serde(default)]
    pub model_version: Option<String>,
    #[serde(rename = "modelMetadata", default = "empty_object")]
    pub metadata: Value,
    #[serde(default = "vailabel_shared::now_iso")]
    pub created_at: String,
    #[serde(default = "vailabel_shared::now_iso")]
    pub updated_at: String,
}

/// camelCase keys mirrored to their snake_case alias on output (matches
/// `ai_model_to_json`).
const SNAKE_ALIASES: &[(&str, &str)] = &[
    ("projectId", "project_id"),
    ("modelPath", "model_path"),
    ("configPath", "config_path"),
    ("modelSize", "model_size"),
    ("isCustom", "is_custom"),
    ("type", "model_type"),
    ("isActive", "is_active"),
    ("lastUsed", "last_used"),
    ("labelsPath", "labels_path"),
    ("defaultRank", "default_rank"),
    ("supportsLabelStudioFormat", "supports_label_studio_format"),
    ("taskType", "task_type"),
    ("modelVersion", "model_version"),
    ("modelMetadata", "model_metadata"),
    ("createdAt", "created_at"),
    ("updatedAt", "updated_at"),
];

impl AiModel {
    /// The dual-key JSON wire form (camelCase + snake_case aliases), matching the
    /// residual store's `ai_model_to_json` output.
    pub fn to_value(&self) -> Value {
        let value = serde_json::to_value(self).unwrap_or(Value::Null);
        with_snake_aliases(value, SNAKE_ALIASES)
    }
}

fn default_name() -> String {
    "Model".to_string()
}
fn default_version() -> String {
    "1.0.0".to_string()
}
fn default_model_type() -> String {
    "object_detection".to_string()
}
fn default_task_type() -> Option<String> {
    Some("object_detection".to_string())
}
fn default_status() -> String {
    "inactive".to_string()
}
fn default_category() -> Option<String> {
    Some("detection".to_string())
}
fn default_backend() -> Option<String> {
    Some("cpu".to_string())
}
fn default_framework() -> Option<String> {
    Some("onnx".to_string())
}
fn default_rank() -> Option<i32> {
    Some(999)
}
fn default_true() -> bool {
    true
}
fn empty_object() -> Value {
    json!({})
}

impl Identifiable for AiModel {
    fn id(&self) -> &str {
        &self.id
    }
}

impl Entity for AiModel {}
impl AggregateRoot for AiModel {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserializes_from_empty_object_and_mints_id() {
        // With `id` self-defaulting, a payload that omits it still deserializes
        // (the aggregate mints a uuid) — this is what let us delete normalize_entity.
        let model: AiModel = serde_json::from_value(json!({})).unwrap();
        assert!(!model.id.is_empty());
        assert_eq!(model.task_type.as_deref(), Some("object_detection"));
    }
}
