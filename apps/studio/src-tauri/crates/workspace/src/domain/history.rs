//! The per-project undo/redo `History` snapshot entity.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use vailabel_core::{Entity, Identifiable};

/// An undo/redo history snapshot for a project. `labels` is an opaque JSON blob
/// (the serialized history stack) the frontend round-trips verbatim.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct History {
    pub id: String,
    #[serde(default)]
    pub project_id: Option<String>,
    #[serde(default = "empty_labels")]
    pub labels: Value,
    #[serde(default)]
    pub history_index: i32,
    #[serde(default)]
    pub can_undo: bool,
    #[serde(default)]
    pub can_redo: bool,
    #[serde(default = "vailabel_shared::now_iso")]
    pub created_at: String,
    #[serde(default = "vailabel_shared::now_iso")]
    pub updated_at: String,
}

fn empty_labels() -> Value {
    Value::Array(Vec::new())
}

impl Identifiable for History {
    fn id(&self) -> &str {
        &self.id
    }
}

impl Entity for History {}
