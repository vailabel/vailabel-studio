//! The `Project` aggregate root.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use vailabel_core::{AggregateRoot, Entity, Identifiable};

// ── Typed project configuration (stored in config_json, not settings_json) ───

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectGeneralConfig {
    #[serde(default = "default_true")]
    pub auto_save: bool,
    /// "name" | "color" | "both"
    #[serde(default = "default_label_display")]
    pub label_display_mode: String,
    #[serde(default)]
    pub snap_to_grid: bool,
}

impl Default for ProjectGeneralConfig {
    fn default() -> Self {
        Self {
            auto_save: true,
            label_display_mode: default_label_display(),
            snap_to_grid: false,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectExportConfig {
    /// "yolo" | "coco" | "labelme" | "csv"
    #[serde(default = "default_export_format")]
    pub default_format: String,
    #[serde(default = "default_true")]
    pub include_images: bool,
    #[serde(default = "default_true")]
    pub normalize_coordinates: bool,
}

impl Default for ProjectExportConfig {
    fn default() -> Self {
        Self {
            default_format: default_export_format(),
            include_images: true,
            normalize_coordinates: true,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectAiConfig {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_model_id: Option<String>,
    #[serde(default = "default_confidence")]
    pub default_confidence: f64,
    #[serde(default = "default_true")]
    pub copilot_enabled: bool,
    /// "auto" | "on" | "off"
    #[serde(default = "default_vision")]
    pub copilot_vision: String,
}

impl Default for ProjectAiConfig {
    fn default() -> Self {
        Self {
            default_model_id: None,
            default_confidence: 0.25,
            copilot_enabled: true,
            copilot_vision: default_vision(),
        }
    }
}

/// Per-project cloud storage binding. References a global Cloud Connection by id
/// so secrets never live here.
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProjectStorageConfig {
    /// id of a `CloudStorageConfig` from global settings. None = local only.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub connection_id: Option<String>,
    /// Object-key prefix inside the bucket. None = default `projects/{id}/images/`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prefix: Option<String>,
}

/// How a project's detector is (re)trained. Drives the training dialog's
/// defaults and, when `auto_retrain` is on, automatic retraining.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTrainingConfig {
    /// Start a training run automatically once enough new items are labeled.
    #[serde(default)]
    pub auto_retrain: bool,
    /// Newly labeled items (since the last run) that trigger a retrain.
    #[serde(default = "default_min_new_items")]
    pub min_new_items: u32,
    /// Training agent to run on. None = this computer.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,
    /// "yolo" | "rtdetr"
    #[serde(default = "default_model_family")]
    pub model_family: String,
    #[serde(default = "default_epochs")]
    pub epochs: u32,
    /// Fine-tune from the project's last trained model instead of from scratch.
    #[serde(default = "default_true")]
    pub continue_from_last: bool,
}

impl Default for ProjectTrainingConfig {
    fn default() -> Self {
        Self {
            auto_retrain: false,
            min_new_items: default_min_new_items(),
            agent_id: None,
            model_family: default_model_family(),
            epochs: default_epochs(),
            continue_from_last: true,
        }
    }
}

/// Typed per-project configuration. Stored in `config_json`, separate from the
/// legacy unstructured `settings_json` blob.
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProjectConfig {
    #[serde(default)]
    pub general: ProjectGeneralConfig,
    #[serde(default)]
    pub export: ProjectExportConfig,
    #[serde(default)]
    pub ai: ProjectAiConfig,
    #[serde(default)]
    pub storage: ProjectStorageConfig,
    #[serde(default)]
    pub training: ProjectTrainingConfig,
}

fn default_min_new_items() -> u32 {
    50
}
fn default_model_family() -> String {
    "yolo".to_string()
}
fn default_epochs() -> u32 {
    50
}
fn default_true() -> bool {
    true
}
fn default_label_display() -> String {
    "both".to_string()
}
fn default_export_format() -> String {
    "yolo".to_string()
}
fn default_confidence() -> f64 {
    0.25
}
fn default_vision() -> String {
    "auto".to_string()
}

// ── Project aggregate root ────────────────────────────────────────────────────

/// A labeling project — the top-level container an annotator works within.
///
/// The serde shape (camelCase, the `type` rename, the `settings`/`metadata`
/// JSON blobs, and the timestamp defaults) is identical to the binary's
/// historical `Project` so existing stored rows and IPC payloads round-trip
/// unchanged.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub project_type: String,
    /// Coarse data type of the project's items: image | video | text | audio.
    #[serde(default = "default_modality")]
    pub modality: String,
    /// Labeling task within the modality: detection | segmentation |
    /// classification | keypoints | ner | ...
    #[serde(default = "default_task")]
    pub task: String,
    pub status: String,
    pub settings: Value,
    pub metadata: Value,
    /// Typed per-project settings. None means defaults apply everywhere.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub config: Option<ProjectConfig>,
    #[serde(default = "vailabel_shared::now_iso")]
    pub created_at: String,
    #[serde(default = "vailabel_shared::now_iso")]
    pub updated_at: String,
    /// Number of images in the project. Derived by the list/get queries from the
    /// images table — it is not a stored column. Defaults to 0 (e.g. on the
    /// create/update round-trip, where the real count comes from a later list).
    #[serde(default)]
    pub item_count: i64,
}

fn default_modality() -> String {
    "image".to_string()
}

fn default_task() -> String {
    "detection".to_string()
}

impl Identifiable for Project {
    fn id(&self) -> &str {
        &self.id
    }
}

impl Entity for Project {}
impl AggregateRoot for Project {}
