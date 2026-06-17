//! Prompt inputs for runtime-backed inference.
//!
//! User-supplied guidance (click points / boxes / text) for a promptable model
//! run, deserialized from the frontend's `pipeline_run` payload
//! ([`crate::features::ai::model::PipelineRunPayload`]) and mapped into the
//! embedded Python runtime's segmentation request. Inference itself runs in the
//! Python runtime (ultralytics / torch) — there is no longer an in-Rust
//! plugin/engine abstraction.

#![allow(dead_code)]

use serde::Deserialize;

/// A single click point used by interactive segmentation (Click-To-Segment).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PointPrompt {
    pub x: f32,
    pub y: f32,
    /// Foreground (true) vs background (false) point.
    #[serde(default = "default_true")]
    pub positive: bool,
}

fn default_true() -> bool {
    true
}

/// A box prompt (e.g. SAM box prompt, or a region to segment).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BoxPrompt {
    pub x1: f32,
    pub y1: f32,
    pub x2: f32,
    pub y2: f32,
}

/// User-supplied guidance for a pipeline run. Empty for fully-automatic runs
/// (Auto Bounding Box / Batch Auto Labeling); populated for Click-To-Segment
/// (points/boxes) and Prompt-To-Detect (text).
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptInput {
    #[serde(default)]
    pub points: Vec<PointPrompt>,
    #[serde(default)]
    pub boxes: Vec<BoxPrompt>,
    #[serde(default)]
    pub text: Option<String>,
}
