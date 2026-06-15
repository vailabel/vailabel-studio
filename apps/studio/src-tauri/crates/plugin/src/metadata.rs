//! Plugin identity, kind, and lifecycle state.

use serde::{Deserialize, Serialize};

/// The capability category a plugin provides.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PluginKind {
    /// Object detection (bounding boxes).
    Detector,
    /// Instance/semantic segmentation (masks).
    Segmenter,
    /// Optical character recognition.
    Ocr,
    /// Dataset/annotation export to an external format.
    Exporter,
    /// Model training / fine-tuning.
    Trainer,
    /// Embedding generation (e.g. CLIP) for search.
    Embedding,
}

/// Where a plugin is in its lifecycle. Transitions are driven by
/// [`crate::PluginLifecycle`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PluginState {
    /// Present on disk but not yet loaded into the process.
    Installed,
    /// Loaded into the process, not yet accepting work.
    Loaded,
    /// Active and accepting work.
    Enabled,
    /// Loaded but temporarily not accepting work.
    Disabled,
    /// Removed from the process.
    Unloaded,
}

/// Descriptive identity of a plugin instance.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginMetadata {
    /// Stable unique id, e.g. `"yolov8-detector"`.
    pub id: String,
    /// Human-readable name.
    pub name: String,
    /// Semantic version string.
    pub version: String,
    /// Which capability this plugin provides.
    pub kind: PluginKind,
    /// Optional longer description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}
