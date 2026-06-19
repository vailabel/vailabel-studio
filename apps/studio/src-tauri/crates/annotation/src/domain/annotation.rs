//! The `Annotation` aggregate — a single labeled shape on an image.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use vailabel_core::{AggregateRoot, Entity, Identifiable};

use super::wire::with_snake_aliases;

/// A single annotation shape (box/polygon/point/…). The serde shape matches the
/// frontend `Annotation`: camelCase, with `annotation_type` serialized as `type`
/// and `is_ai_generated` as `isAIGenerated`. `coordinates`/`flags`/`meta` are
/// opaque JSON the frontend round-trips. Snake aliases are accepted on input and
/// re-emitted by [`Annotation::to_value`] for byte-compatibility with the prior
/// residual-store output.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Annotation {
    #[serde(default = "vailabel_shared::new_id")]
    pub id: String,
    pub item_id: String,
    #[serde(default)]
    pub label_id: Option<String>,
    #[serde(default = "default_name")]
    pub name: String,
    #[serde(default = "default_color")]
    pub color: String,
    #[serde(rename = "type", default = "default_type")]
    pub annotation_type: String,
    #[serde(default = "empty_array")]
    pub coordinates: Value,
    #[serde(default)]
    pub group_id: Option<i32>,
    #[serde(default)]
    pub flags: Value,
    #[serde(default)]
    pub meta: Value,
    #[serde(default)]
    pub project_id: Option<String>,
    #[serde(rename = "isAIGenerated", default)]
    pub is_ai_generated: bool,
    #[serde(default = "vailabel_shared::now_iso")]
    pub created_at: String,
    #[serde(default = "vailabel_shared::now_iso")]
    pub updated_at: String,
}

/// camelCase keys mirrored to their snake_case alias on output.
const SNAKE_ALIASES: &[(&str, &str)] = &[
    ("itemId", "item_id"),
    ("labelId", "label_id"),
    ("groupId", "group_id"),
    ("projectId", "project_id"),
    ("isAIGenerated", "is_ai_generated"),
    ("createdAt", "created_at"),
    ("updatedAt", "updated_at"),
];

impl Annotation {
    /// The dual-key JSON wire form (camelCase + snake_case aliases), matching the
    /// residual store's `annotation_to_json` output so every frontend reader keeps
    /// working. Used for IPC responses and event payloads.
    pub fn to_value(&self) -> Value {
        let value = serde_json::to_value(self).unwrap_or(Value::Null);
        with_snake_aliases(value, SNAKE_ALIASES)
    }
}

fn default_name() -> String {
    "Annotation".to_string()
}

fn default_color() -> String {
    "#FF0000".to_string()
}

fn default_type() -> String {
    "box".to_string()
}

fn empty_array() -> Value {
    json!([])
}

impl Identifiable for Annotation {
    fn id(&self) -> &str {
        &self.id
    }
}

impl Entity for Annotation {}
impl AggregateRoot for Annotation {}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn deserializes_dual_key_payload_without_duplicate_field_error() {
        // The AiService/import paths build values with BOTH camel and snake keys.
        // camelCase-only serde must consume the camel keys and ignore the snake
        // duplicates (no `duplicate field` error).
        let value = json!({
            "id": "a1",
            "itemId": "img", "item_id": "img",
            "labelId": "l1", "label_id": "l1",
            "type": "polygon",
            "coordinates": [{"x": 1.0, "y": 2.0}],
            "groupId": 3, "group_id": 3,
            "projectId": "p", "project_id": "p",
            "isAIGenerated": true,
        });
        let annotation: Annotation = serde_json::from_value(value).expect("deserialize");
        assert_eq!(annotation.item_id, "img");
        assert_eq!(annotation.label_id.as_deref(), Some("l1"));
        assert_eq!(annotation.annotation_type, "polygon");
        assert_eq!(annotation.group_id, Some(3));
        assert!(annotation.is_ai_generated);
    }

    #[test]
    fn to_value_emits_both_casings() {
        let annotation = Annotation {
            id: "a1".into(),
            item_id: "img".into(),
            label_id: Some("l1".into()),
            name: "Box".into(),
            color: "#fff".into(),
            annotation_type: "box".into(),
            coordinates: json!([]),
            group_id: None,
            flags: Value::Null,
            meta: Value::Null,
            project_id: Some("p".into()),
            is_ai_generated: true,
            created_at: "t".into(),
            updated_at: "t".into(),
        };
        let out = annotation.to_value();
        assert_eq!(out["itemId"], json!("img"));
        assert_eq!(out["item_id"], json!("img"));
        assert_eq!(out["type"], json!("box"));
        assert_eq!(out["isAIGenerated"], json!(true));
        assert_eq!(out["is_ai_generated"], json!(true));
        assert_eq!(out["projectId"], json!("p"));
        assert_eq!(out["project_id"], json!("p"));
    }
}
