//! AI request/response payloads.
//!
//! The pure, self-contained DTOs have been extracted to module crates and are
//! re-exported below so existing `crate::features::ai::model::*` paths are
//! unchanged:
//! - model-management payloads → `vailabel-models` (`ModelImportPayload`,
//!   `ModelComponent`, `ModelInstallPayload`, `GitHubReleaseLookupPayload`,
//!   `ModelActivationPayload`, `RuntimeInstallPayload`).
//! - copilot payloads → `vailabel-copilot` (`CopilotTurnPayload`,
//!   `CopilotActionPayload`, `CopilotTestPayload`, `CopilotTestResult`), and the
//!   `CopilotLlmConfig` (`vailabel_copilot::domain`).
//!
//! The prediction/inference types below stay here: they are coupled to the
//! plugin/inference engine (`PipelineRunPayload` carries a [`PromptInput`];
//! `InferencePoint`/`InferenceAnnotationDraft` are produced by `inference`,
//! `plugin`, and `engines::sam`). These migrate in a later phase.

use serde::{Deserialize, Serialize};

use crate::features::ai::plugin::PromptInput;

pub use vailabel_copilot::contracts::{
    CopilotActionPayload, CopilotTestPayload, CopilotTestResult, CopilotTurnPayload,
};
pub use vailabel_copilot::domain::CopilotLlmConfig;
pub use vailabel_models::contracts::{
    GitHubReleaseLookupPayload, ModelActivationPayload, ModelComponent, ModelImportPayload,
    ModelInstallPayload, RuntimeInstallPayload,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemIdPayload {
    pub item_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PredictionGeneratePayload {
    pub item_id: String,
    pub model_id: String,
    pub threshold: Option<f32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PredictionActionPayload {
    pub prediction_id: String,
    /// Optional label to assign on accept, overriding the model's predicted label
    /// (lets the user correct a suggestion before accepting it).
    #[serde(default)]
    pub label_id: Option<String>,
}

/// One prompt-driven inference run for a capability-aware model plugin
/// (SAM click/box-to-segment, open-vocab prompt-to-detect, …). Mirrors
/// [`PredictionGeneratePayload`] but carries a [`PromptInput`] and an optional
/// `registry_id` so the service can dispatch to the right
/// [`crate::features::ai::plugin::ModelPlugin`]. When `registry_id` is omitted the
/// service derives it from the model entity (family / category / task).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PipelineRunPayload {
    pub item_id: String,
    pub model_id: String,
    #[serde(default)]
    pub registry_id: Option<String>,
    pub threshold: Option<f32>,
    #[serde(default)]
    pub prompt: PromptInput,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InferencePoint {
    pub x: f32,
    pub y: f32,
}

/// One inference draft. Produced by the embedded Python AI runtime (deserialized
/// from its `/inference/*` JSON) and consumed by `AiService::persist_drafts`. The
/// label fields default because the runtime leaves label resolution to the Rust
/// side (`resolve_prediction_label`); any extra fields the runtime sends (e.g.
/// `classId`) are ignored.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InferenceAnnotationDraft {
    pub name: String,
    #[serde(rename = "type")]
    pub annotation_type: String,
    pub coordinates: Vec<InferencePoint>,
    pub confidence: f32,
    #[serde(default)]
    pub label_id: Option<String>,
    #[serde(default)]
    pub label_name: Option<String>,
    #[serde(default)]
    pub label_color: Option<String>,
    #[serde(default)]
    pub is_ai_generated: bool,
}
