//! The persistence record for `LabelClass` and its mapping to/from the domain.

use diesel::prelude::*;

use super::schema::labels;
use crate::domain::LabelClass;

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
