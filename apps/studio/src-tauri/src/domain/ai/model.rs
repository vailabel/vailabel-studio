use serde::{Deserialize, Serialize};

use crate::domain::ai::plugin::PromptInput;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelImportPayload {
    pub name: String,
    pub description: String,
    pub version: String,
    pub category: String,
    #[serde(rename = "type")]
    pub model_type: String,
    pub model_file_path: String,
    pub config_file_path: Option<String>,
    pub project_id: Option<String>,
}

/// An extra file that belongs to a multi-file model download (e.g. SAM's
/// `mask_decoder.onnx` alongside the primary `image_encoder.onnx`, or a
/// `tokenizer.json`). Downloaded into the same model directory as the primary
/// asset and resolved by the plugin via its conventional filename.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelComponent {
    /// Target filename. When omitted it is derived from the URL. Only the final
    /// path component is used (no directory traversal).
    pub file_name: Option<String>,
    pub url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInstallPayload {
    pub name: String,
    pub description: String,
    pub version: String,
    pub category: String,
    #[serde(rename = "type")]
    pub model_type: String,
    pub task_type: Option<String>,
    pub download_url: String,
    pub file_name: Option<String>,
    pub project_id: Option<String>,
    /// Extra files for multi-file models (SAM = encoder + decoder, open-vocab =
    /// model + tokenizer). Empty for single-file models like YOLO.
    #[serde(default)]
    pub components: Vec<ModelComponent>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubReleaseLookupPayload {
    pub owner: String,
    pub repo: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelActivationPayload {
    pub model_id: String,
}

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

/// Options for the on-demand ONNX Runtime installer. `gpu` defaults to true so
/// the GPU package (which also runs on CPU) is fetched and cuDNN is attempted.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeInstallPayload {
    #[serde(default)]
    pub gpu: Option<bool>,
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

/// A local OpenAI-compatible LLM/VLM the copilot auto-discovers and uses for its
/// conversational + vision replies (LM Studio, Ollama, llama.cpp). It is built on
/// the backend by `llm::discover_local_llm` — there is no client-side config, so
/// this is constructed in Rust, never deserialized from the webview.
#[derive(Debug, Clone)]
pub struct CopilotLlmConfig {
    /// Discovery source tag, e.g. "auto".
    pub provider: String,
    /// Base URL including the `/v1` suffix, e.g. http://localhost:1234/v1.
    pub base_url: String,
    pub model: String,
    /// Whether the picked model accepts image input (VLM).
    pub vision: bool,
}

/// One chat turn for the local AI copilot. The copilot auto-discovers the local
/// model itself, so the client sends no LLM configuration.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopilotTurnPayload {
    pub project_id: Option<String>,
    pub image_id: String,
    pub message: String,
}

/// A human-approved mutation the copilot proposed (relabel / delete / new label).
/// Tagged by `kind` so the frontend can round-trip a `ProposedAction` back.
#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum CopilotActionPayload {
    #[serde(rename_all = "camelCase")]
    Relabel {
        annotation_id: String,
        to_label: String,
    },
    #[serde(rename_all = "camelCase")]
    Delete { annotation_id: String },
    #[serde(rename_all = "camelCase")]
    CreateLabel {
        name: String,
        #[serde(default)]
        color: Option<String>,
        project_id: String,
    },
}
