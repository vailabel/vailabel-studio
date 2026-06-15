//! Request payloads for AI model management commands.

use serde::Deserialize;

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

/// Options for the on-demand ONNX Runtime installer. `gpu` defaults to true so
/// the GPU package (which also runs on CPU) is fetched and cuDNN is attempted.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeInstallPayload {
    #[serde(default)]
    pub gpu: Option<bool>,
}
