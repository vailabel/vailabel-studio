use serde::{Deserialize, Serialize};

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
