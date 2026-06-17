//! The persistence record for `Project` and its mapping to/from the domain type.

use diesel::prelude::*;
use serde_json::Value;

use super::schema::projects;
use crate::domain::{Project, ProjectConfig};

/// The `projects` table row. Mirrors the columns the residual store created; the
/// `*_json` columns hold the serialized `settings`/`metadata` blobs.
/// `config_json` holds the typed `ProjectConfig` struct (added in migration 002).
#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = projects)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct ProjectRow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub project_type: String,
    pub modality: Option<String>,
    pub task: Option<String>,
    pub status: String,
    pub settings_json: Option<String>,
    pub metadata_json: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub config_json: Option<String>,
}

impl ProjectRow {
    /// Build a row for insert/update. Mirrors the residual store's
    /// `project_row_from`: `updated_at` is always refreshed to `now`,
    /// `created_at` is preserved (or `now` if absent), `status` defaults to
    /// `"active"`, and `settings`/`metadata` are JSON-stringified.
    pub fn from_project(p: &Project, now: &str) -> Self {
        Self {
            id: p.id.clone(),
            name: p.name.clone(),
            description: p.description.clone(),
            project_type: p.project_type.clone(),
            modality: Some(p.modality.clone()),
            task: Some(p.task.clone()),
            status: if p.status.is_empty() {
                "active".to_string()
            } else {
                p.status.clone()
            },
            settings_json: Some(p.settings.to_string()),
            metadata_json: Some(p.metadata.to_string()),
            created_at: if p.created_at.is_empty() {
                now.to_string()
            } else {
                p.created_at.clone()
            },
            updated_at: now.to_string(),
            config_json: p
                .config
                .as_ref()
                .and_then(|c| serde_json::to_string(c).ok()),
        }
    }

    /// Convert a stored row back into the domain `Project`, attaching the
    /// derived `image_count`. Mirrors the residual store's `project_to_json`:
    /// `modality`/`task` fall back to legacy-derived values when the columns are
    /// null, and the `*_json` blobs are parsed (or `Null`).
    pub fn into_project(self, image_count: i64) -> Project {
        let modality = self.modality.unwrap_or_else(|| "image".to_string());
        let task = self
            .task
            .unwrap_or_else(|| derive_task_from_legacy(&self.project_type));
        let config: Option<ProjectConfig> = self
            .config_json
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok());
        Project {
            id: self.id,
            name: self.name,
            description: self.description,
            project_type: self.project_type,
            modality,
            task,
            status: self.status,
            settings: parse_json_field(self.settings_json.as_deref()),
            metadata: parse_json_field(self.metadata_json.as_deref()),
            config,
            created_at: self.created_at,
            updated_at: self.updated_at,
            image_count,
        }
    }
}

fn parse_json_field(s: Option<&str>) -> Value {
    s.and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or(Value::Null)
}

/// Backfill `task` for legacy rows that predate the explicit column (matches the
/// residual store's mapping).
fn derive_task_from_legacy(project_type: &str) -> String {
    match project_type {
        "object_detection" | "detection" => "detection",
        "segmentation" | "instance_segmentation" | "semantic_segmentation" => "segmentation",
        "classification" => "classification",
        "keypoints" | "keypoint" => "keypoints",
        _ => "detection",
    }
    .to_string()
}
