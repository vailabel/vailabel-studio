//! The persistence records for the Annotation module aggregates (`LabelClass`,
//! `Annotation`, `Prediction`) and their mapping to/from the domain types.

use diesel::prelude::*;
use serde_json::{json, Value};

use super::schema::{annotations, labels, predictions};
use crate::domain::{Annotation, LabelClass, Prediction};

/// Serialize a JSON `coordinates` value to its stored string (`"[]"` when null).
fn coords_to_string(value: &Value) -> String {
    if value.is_null() {
        "[]".to_string()
    } else {
        value.to_string()
    }
}

/// Serialize an optional JSON blob column (`None` when the value is null).
fn json_or_none(value: &Value) -> Option<String> {
    if value.is_null() {
        None
    } else {
        Some(value.to_string())
    }
}

/// Parse stored coordinates JSON, falling back to an empty array.
fn parse_or_empty_array(stored: &str) -> Value {
    serde_json::from_str(stored).unwrap_or_else(|_| json!([]))
}

/// Parse an optional JSON blob column, falling back to JSON null.
fn parse_or_null(stored: Option<&str>) -> Value {
    stored
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or(Value::Null)
}

/// The `labels` table row. `category`/`description` are table columns the slim
/// `LabelClass` does not carry (the typed path has always dropped them), so they
/// round-trip as `None`, matching the residual store's behavior.
#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = labels)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct LabelRow {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub color: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub is_ai_generated: i32,
    pub created_at: String,
    pub updated_at: String,
}

impl LabelRow {
    /// Build a row for insert/update. Mirrors the residual store's
    /// `label_row_from`: `color` defaults to `#FF0000` when empty, `updated_at`
    /// refreshed to `now`, `created_at` preserved (or `now`), `category`/
    /// `description` left `None`.
    pub fn from_label(label: &LabelClass, now: &str) -> Self {
        Self {
            id: label.id.clone(),
            project_id: label.project_id.clone(),
            name: label.name.clone(),
            color: if label.color.is_empty() {
                "#FF0000".to_string()
            } else {
                label.color.clone()
            },
            category: None,
            description: None,
            is_ai_generated: i32::from(label.is_ai_generated),
            created_at: if label.created_at.is_empty() {
                now.to_string()
            } else {
                label.created_at.clone()
            },
            updated_at: now.to_string(),
        }
    }

    /// Convert a stored row back into the domain `LabelClass` (drops
    /// `category`/`description`, matching the typed path).
    pub fn into_label(self) -> LabelClass {
        LabelClass {
            id: self.id,
            name: self.name,
            color: self.color,
            project_id: self.project_id,
            is_ai_generated: self.is_ai_generated != 0,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

/// The `annotations` table row.
#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = annotations)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct AnnotationRow {
    pub id: String,
    pub item_id: String,
    pub label_id: Option<String>,
    pub name: String,
    pub color: String,
    pub annotation_type: String,
    pub coordinates_json: String,
    pub group_id: Option<i32>,
    pub flags_json: Option<String>,
    pub meta_json: Option<String>,
    pub project_id: Option<String>,
    pub is_ai_generated: i32,
    pub created_at: String,
    pub updated_at: String,
}

impl AnnotationRow {
    /// Build a row for insert/update. Mirrors the residual store's
    /// `annotation_row_from`: `color`/`type` defaults, `updated_at` refreshed,
    /// `created_at` preserved, JSON columns serialized.
    pub fn from_annotation(annotation: &Annotation, now: &str) -> Self {
        Self {
            id: annotation.id.clone(),
            item_id: annotation.item_id.clone(),
            label_id: annotation.label_id.clone(),
            name: annotation.name.clone(),
            color: if annotation.color.is_empty() {
                "#FF0000".to_string()
            } else {
                annotation.color.clone()
            },
            annotation_type: if annotation.annotation_type.is_empty() {
                "box".to_string()
            } else {
                annotation.annotation_type.clone()
            },
            coordinates_json: coords_to_string(&annotation.coordinates),
            group_id: annotation.group_id,
            flags_json: json_or_none(&annotation.flags),
            meta_json: json_or_none(&annotation.meta),
            project_id: annotation.project_id.clone(),
            is_ai_generated: i32::from(annotation.is_ai_generated),
            created_at: if annotation.created_at.is_empty() {
                now.to_string()
            } else {
                annotation.created_at.clone()
            },
            updated_at: now.to_string(),
        }
    }

    pub fn into_annotation(self) -> Annotation {
        Annotation {
            id: self.id,
            item_id: self.item_id,
            label_id: self.label_id,
            name: self.name,
            color: self.color,
            annotation_type: self.annotation_type,
            coordinates: parse_or_empty_array(&self.coordinates_json),
            group_id: self.group_id,
            flags: parse_or_null(self.flags_json.as_deref()),
            meta: parse_or_null(self.meta_json.as_deref()),
            project_id: self.project_id,
            is_ai_generated: self.is_ai_generated != 0,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

/// The `predictions` table row.
#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = predictions)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct PredictionRow {
    pub id: String,
    pub item_id: String,
    pub label_id: Option<String>,
    pub label_name: Option<String>,
    pub label_color: Option<String>,
    pub model_id: Option<String>,
    pub name: String,
    pub prediction_type: String,
    pub coordinates_json: String,
    pub confidence: f64,
    pub project_id: Option<String>,
    pub color: Option<String>,
    pub is_ai_generated: i32,
    pub backend: Option<String>,
    pub inference_ms: Option<f64>,
    pub model_version: Option<String>,
    pub family: Option<String>,
    pub variant: Option<String>,
    pub from_name: Option<String>,
    pub to_name: Option<String>,
    pub result_type: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl PredictionRow {
    pub fn from_prediction(prediction: &Prediction, now: &str) -> Self {
        Self {
            id: prediction.id.clone(),
            item_id: prediction.item_id.clone(),
            label_id: prediction.label_id.clone(),
            label_name: prediction.label_name.clone(),
            label_color: prediction.label_color.clone(),
            model_id: prediction.model_id.clone(),
            name: prediction.name.clone(),
            prediction_type: if prediction.prediction_type.is_empty() {
                "box".to_string()
            } else {
                prediction.prediction_type.clone()
            },
            coordinates_json: coords_to_string(&prediction.coordinates),
            confidence: prediction.confidence,
            project_id: prediction.project_id.clone(),
            color: prediction.color.clone(),
            is_ai_generated: i32::from(prediction.is_ai_generated),
            backend: prediction.backend.clone(),
            inference_ms: prediction.inference_ms,
            model_version: prediction.model_version.clone(),
            family: prediction.family.clone(),
            variant: prediction.variant.clone(),
            from_name: prediction.from_name.clone(),
            to_name: prediction.to_name.clone(),
            result_type: prediction.result_type.clone(),
            created_at: if prediction.created_at.is_empty() {
                now.to_string()
            } else {
                prediction.created_at.clone()
            },
            updated_at: now.to_string(),
        }
    }

    pub fn into_prediction(self) -> Prediction {
        Prediction {
            id: self.id,
            item_id: self.item_id,
            label_id: self.label_id,
            label_name: self.label_name,
            label_color: self.label_color,
            model_id: self.model_id,
            name: self.name,
            prediction_type: self.prediction_type,
            coordinates: parse_or_empty_array(&self.coordinates_json),
            confidence: self.confidence,
            project_id: self.project_id,
            color: self.color,
            is_ai_generated: self.is_ai_generated != 0,
            backend: self.backend,
            inference_ms: self.inference_ms,
            model_version: self.model_version,
            family: self.family,
            variant: self.variant,
            from_name: self.from_name,
            to_name: self.to_name,
            result_type: self.result_type,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}
