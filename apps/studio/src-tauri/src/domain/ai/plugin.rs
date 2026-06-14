//! Plugin architecture + inference pipeline for AI models.
//!
//! The existing closed-vocabulary detector ([`crate::inference::YoloEngine`]) is
//! the first concrete plugin and runs through the predictions path. This module
//! generalizes that into a capability-aware abstraction so segmentation
//! (SAM2 / MobileSAM), prompt detection (Grounding DINO / YOLO-World), and
//! vision-language (Florence-2) models can plug into the same
//! `Image → Detection → Segmentation → Annotation` pipeline.
//!
//! Phase 1 ships the abstraction + a [`NotImplementedPlugin`] for every model
//! whose ONNX engine is not wired yet. Implementing a model = add a struct that
//! implements [`ModelPlugin`] and route to it in [`plugin_for`].

#![allow(dead_code)]

use crate::domain::ai::model::InferenceAnnotationDraft;
use crate::AppError;
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

/// One unit of work for a model plugin.
pub struct PipelineRequest<'a> {
    pub image_path: &'a str,
    /// The persisted model entity (`ai_models` row) as JSON.
    pub model: &'a serde_json::Value,
    /// Project labels, for label resolution.
    pub labels: &'a [serde_json::Value],
    pub threshold: f32,
    pub prompt: PromptInput,
}

/// Capability-aware model plugin. Produces annotation drafts (boxes or
/// polygons) for the inference pipeline to turn into predictions/annotations.
pub trait ModelPlugin: Send + Sync {
    /// Task identifier, matching `RegistryModel::task`.
    fn task(&self) -> &'static str;

    /// Run inference for one image + prompt.
    fn run(
        &mut self,
        request: &PipelineRequest,
    ) -> Result<Vec<InferenceAnnotationDraft>, AppError>;
}

/// Placeholder for models that are registered + downloadable but whose ONNX
/// inference is not implemented yet. Returns a clear, user-facing error rather
/// than silently doing nothing.
pub struct NotImplementedPlugin {
    pub model_name: String,
    pub task: &'static str,
}

impl ModelPlugin for NotImplementedPlugin {
    fn task(&self) -> &'static str {
        self.task
    }

    fn run(
        &mut self,
        _request: &PipelineRequest,
    ) -> Result<Vec<InferenceAnnotationDraft>, AppError> {
        Err(AppError::Message(format!(
            "{} inference is not implemented yet (Phase 1 scaffold). The model is registered \
             and its download definition exists; wiring its ONNX engine is the next step.",
            self.model_name
        )))
    }
}

/// Resolve a plugin for a registry model id. Detection currently runs through
/// the existing YOLO predictions path; every other registry entry resolves to a
/// [`NotImplementedPlugin`] until its engine lands.
pub fn plugin_for(registry_id: &str) -> Box<dyn ModelPlugin> {
    let entry = super::registry::find(registry_id);
    let (name, task) = match entry {
        Some(m) => (m.name.to_string(), m.task),
        None => (registry_id.to_string(), "unknown"),
    };

    // As concrete engines are implemented, branch here, e.g.:
    //   "mobile-sam" | "sam2" => Box::new(SamSegmenter::new(...)?),
    Box::new(NotImplementedPlugin {
        model_name: name,
        task,
    })
}
