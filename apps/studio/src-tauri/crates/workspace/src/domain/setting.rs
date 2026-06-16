//! The `Setting` key/value entity.

use serde::{Deserialize, Serialize};
use vailabel_core::{Entity, Identifiable};

/// A single application setting. Identity for storage is the unique `key`; `id`
/// is a stable surrogate preserved across updates. Serde is camelCase, matching
/// the JSON the frontend reads/writes.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Setting {
    pub id: String,
    pub key: String,
    #[serde(default)]
    pub value: String,
    #[serde(default = "vailabel_shared::now_iso")]
    pub created_at: String,
    #[serde(default = "vailabel_shared::now_iso")]
    pub updated_at: String,
}

impl Identifiable for Setting {
    fn id(&self) -> &str {
        &self.id
    }
}

impl Entity for Setting {}
