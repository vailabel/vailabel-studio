//! The `LabelClass` aggregate — a label definition in a project's catalog.

use serde::{Deserialize, Serialize};
use vailabel_core::{AggregateRoot, Entity, Identifiable};

/// A label class (the spec's `LabelClass`). The serde shape is identical to the
/// binary's historical `Label` (camelCase; `is_ai_generated` → `isAiGenerated`),
/// so stored rows and IPC payloads round-trip unchanged. The table additionally
/// has `category`/`description` columns that this slim aggregate does not carry
/// — the typed path has always dropped them (preserved for parity).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LabelClass {
    pub id: String,
    pub name: String,
    pub color: String,
    pub project_id: String,
    #[serde(default)]
    pub is_ai_generated: bool,
    #[serde(default = "vailabel_shared::now_iso")]
    pub created_at: String,
    #[serde(default = "vailabel_shared::now_iso")]
    pub updated_at: String,
}

impl Identifiable for LabelClass {
    fn id(&self) -> &str {
        &self.id
    }
}

impl Entity for LabelClass {}
impl AggregateRoot for LabelClass {}
