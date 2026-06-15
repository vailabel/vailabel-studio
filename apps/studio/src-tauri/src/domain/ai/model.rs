//! AI request/response payloads.
//!
//! The pure, self-contained DTOs have been extracted to module crates and are
//! re-exported below so existing `crate::domain::ai::model::*` paths are
//! unchanged:
//! - model-management payloads → `vailabel-models` (`ModelImportPayload`,
//!   `ModelComponent`, `ModelInstallPayload`, `GitHubReleaseLookupPayload`,
//!   `ModelActivationPayload`, `RuntimeInstallPayload`).
//! - copilot payloads → `vailabel-copilot` (`CopilotTurnPayload`,
//!   `CopilotActionPayload`, `CopilotTestPayload`, `CopilotTestResult`).
//!
//! The prediction/inference types below stay here: they are coupled to the
//! plugin/inference engine (`PipelineRunPayload` carries a [`PromptInput`];
//! `InferencePoint`/`InferenceAnnotationDraft` are produced by `inference`,
//! `plugin`, and `engines::sam`), and `CopilotLlmConfig` is built in Rust by
//! `llm`, never deserialized. These migrate in a later phase.

use serde::{Deserialize, Serialize};

use crate::domain::ai::plugin::PromptInput;

pub use vailabel_copilot::contracts::{
    CopilotActionPayload, CopilotTestPayload, CopilotTestResult, CopilotTurnPayload,
};
pub use vailabel_models::contracts::{
    GitHubReleaseLookupPayload, ModelActivationPayload, ModelComponent, ModelImportPayload,
    ModelInstallPayload, RuntimeInstallPayload,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageIdPayload {
    pub image_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PredictionGeneratePayload {
    pub image_id: String,
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
/// [`crate::domain::ai::plugin::ModelPlugin`]. When `registry_id` is omitted the
/// service derives it from the model entity (family / category / task).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PipelineRunPayload {
    pub image_id: String,
    pub model_id: String,
    #[serde(default)]
    pub registry_id: Option<String>,
    pub threshold: Option<f32>,
    #[serde(default)]
    pub prompt: PromptInput,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InferencePoint {
    pub x: f32,
    pub y: f32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InferenceAnnotationDraft {
    pub name: String,
    #[serde(rename = "type")]
    pub annotation_type: String,
    pub coordinates: Vec<InferencePoint>,
    pub confidence: f32,
    pub label_id: Option<String>,
    pub label_name: Option<String>,
    pub label_color: Option<String>,
    pub is_ai_generated: bool,
}

/// A local OpenAI-compatible LLM/VLM the copilot uses for its conversational +
/// vision replies (LM Studio, Ollama, llama.cpp). It is built on the backend
/// either from the user's saved config (Settings → AI Copilot, via
/// `llm::configure_llm`) or by auto-discovery (`llm::discover_local_llm`) when no
/// server is configured — so it is constructed in Rust, never deserialized raw
/// from the webview.
#[derive(Debug, Clone)]
pub struct CopilotLlmConfig {
    /// How this config was resolved: "manual" (saved settings) or "auto".
    pub provider: String,
    /// Base URL including the `/v1` suffix, e.g. http://localhost:1234/v1.
    pub base_url: String,
    pub model: String,
    /// Whether the picked model accepts image input (VLM).
    pub vision: bool,
}
