use std::path::Path;

use serde::Serialize;

use crate::{AppError, InferenceAnnotationDraft};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InferenceMetrics {
  pub backend: String,
  pub init_ms: u128,
  pub infer_ms: u128,
}

pub trait InferenceEngine: Send + Sync {
  fn predict(
    &self,
    image: &serde_json::Value,
    model: &serde_json::Value,
    labels: &[serde_json::Value],
    threshold: f32,
  ) -> Result<(Vec<InferenceAnnotationDraft>, InferenceMetrics), AppError>;
}

pub struct HeuristicEngine;

impl InferenceEngine for HeuristicEngine {
  fn predict(
    &self,
    image: &serde_json::Value,
    model: &serde_json::Value,
    labels: &[serde_json::Value],
    threshold: f32,
  ) -> Result<(Vec<InferenceAnnotationDraft>, InferenceMetrics), AppError> {
    let drafts = crate::build_draft_annotations(image, model, labels, threshold)?;
    let metrics = InferenceMetrics {
      backend: "heuristic".into(),
      init_ms: 0,
      infer_ms: 0,
    };
    Ok((drafts, metrics))
  }
}

#[cfg(feature = "yolo-inference")]
pub struct YoloEngine {
  backend: String,
  model_path: String,
}

#[cfg(feature = "yolo-inference")]
impl YoloEngine {
  pub fn new(model_path: &str) -> Result<Self, AppError> {
    if !Path::new(model_path).exists() {
      return Err(AppError::Message("ONNX model file not found".into()));
    }
    // In a fuller implementation we would initialize ONNX Runtime and load the session here.
    Ok(Self {
      backend: "ort".into(),
      model_path: model_path.to_string(),
    })
  }
}

#[cfg(feature = "yolo-inference")]
impl InferenceEngine for YoloEngine {
  fn predict(
    &self,
    image: &serde_json::Value,
    model: &serde_json::Value,
    labels: &[serde_json::Value],
    threshold: f32,
  ) -> Result<(Vec<InferenceAnnotationDraft>, InferenceMetrics), AppError> {
    // Placeholder: reuse heuristic drafts until full YOLO decode is implemented.
    let drafts = crate::build_draft_annotations(image, model, labels, threshold)?;
    let metrics = InferenceMetrics {
      backend: self.backend.clone(),
      init_ms: 0,
      infer_ms: 0,
    };
    Ok((drafts, metrics))
  }
}
