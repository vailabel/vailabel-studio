//! The `Prediction` aggregate — an AI-generated annotation candidate awaiting
//! review. Accepting one turns it into an [`super::Annotation`].

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use vailabel_core::{Entity, Identifiable};

use super::wire::with_snake_aliases;

/// A model-generated prediction. Mirrors the frontend `Prediction`: camelCase,
/// `prediction_type` serialized as `type`, `is_ai_generated` as `isAIGenerated`,
/// plus the Label-Studio export fields (`fromName`/`toName`/`resultType`/
/// `modelVersion`). [`Prediction::to_value`] re-emits the snake_case aliases the
/// Label Studio adapter reads.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Prediction {
    #[serde(default = "vailabel_shared::new_id")]
    pub id: String,
    pub image_id: String,
    #[serde(default)]
    pub label_id: Option<String>,
    #[serde(default)]
    pub label_name: Option<String>,
    #[serde(default)]
    pub label_color: Option<String>,
    #[serde(default)]
    pub model_id: Option<String>,
    #[serde(default = "default_name")]
    pub name: String,
    #[serde(rename = "type", default = "default_type")]
    pub prediction_type: String,
    #[serde(default = "empty_array")]
    pub coordinates: Value,
    #[serde(default)]
    pub confidence: f64,
    #[serde(default)]
    pub project_id: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(rename = "isAIGenerated", default = "default_true")]
    pub is_ai_generated: bool,
    #[serde(default)]
    pub backend: Option<String>,
    #[serde(default)]
    pub inference_ms: Option<f64>,
    #[serde(default)]
    pub model_version: Option<String>,
    #[serde(default)]
    pub family: Option<String>,
    #[serde(default)]
    pub variant: Option<String>,
    #[serde(default)]
    pub from_name: Option<String>,
    #[serde(default)]
    pub to_name: Option<String>,
    #[serde(default)]
    pub result_type: Option<String>,
    #[serde(default = "vailabel_shared::now_iso")]
    pub created_at: String,
    #[serde(default = "vailabel_shared::now_iso")]
    pub updated_at: String,
}

/// camelCase keys mirrored to their snake_case alias on output.
const SNAKE_ALIASES: &[(&str, &str)] = &[
    ("imageId", "image_id"),
    ("labelId", "label_id"),
    ("labelName", "label_name"),
    ("labelColor", "label_color"),
    ("modelId", "model_id"),
    ("projectId", "project_id"),
    ("isAIGenerated", "is_ai_generated"),
    ("inferenceMs", "inference_ms"),
    ("modelVersion", "model_version"),
    ("fromName", "from_name"),
    ("toName", "to_name"),
    ("resultType", "result_type"),
    ("createdAt", "created_at"),
    ("updatedAt", "updated_at"),
];

impl Prediction {
    /// The dual-key JSON wire form (camelCase + snake_case aliases), matching the
    /// residual store's `prediction_to_json` output.
    pub fn to_value(&self) -> Value {
        let value = serde_json::to_value(self).unwrap_or(Value::Null);
        with_snake_aliases(value, SNAKE_ALIASES)
    }
}

fn default_name() -> String {
    "Prediction".to_string()
}

fn default_type() -> String {
    "box".to_string()
}

fn default_true() -> bool {
    true
}

fn empty_array() -> Value {
    json!([])
}

impl Identifiable for Prediction {
    fn id(&self) -> &str {
        &self.id
    }
}

impl Entity for Prediction {}
