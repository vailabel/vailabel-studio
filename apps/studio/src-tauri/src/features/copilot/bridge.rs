//! The copilot bridge: gather context → call the Python copilot → persist drafts.
//!
//! The copilot's brain (routing, planning, QA, the LLM client, orchestration)
//! moved to the Python runtime (`resources/runtime/copilot/`). This bridge is the
//! thin Rust host for it: for one chat turn it gathers the read-context (item,
//! labels, annotations, resolved detector/segmentation model paths + class names,
//! and the saved LLM settings + keychain key), POSTs `/copilot/turn`, then runs
//! the existing [`AiService`] persistence over the prediction drafts the runtime
//! returns. Secrets and the SQLite store stay on the Rust side; everything the
//! copilot *decides* happens in Python.

use std::sync::Arc;

use serde_json::{json, Value};

use crate::features::ai::model::{CopilotTestPayload, CopilotTestResult, CopilotTurnPayload};
use crate::features::ai::service::AiService;
use crate::features::copilot::types::CopilotTurnResult;
use crate::AppError;
use vailabel_annotation::domain::{AnnotationRepository, LabelRepository};
use vailabel_dataset::domain::ItemRepository;
use vailabel_workspace::domain::SettingRepository;

/// Hosts the Python copilot: context-gathering reads + runtime client + the
/// `AiService` persistence path. Constructed once at the composition root.
pub struct CopilotBridge {
    ai: Arc<AiService>,
    runtime: Arc<runtime_manager::RuntimeService>,
    items: Arc<dyn ItemRepository>,
    labels: Arc<dyn LabelRepository>,
    annotations: Arc<dyn AnnotationRepository>,
    settings: Arc<dyn SettingRepository>,
    app: tauri::AppHandle,
}

impl CopilotBridge {
    pub fn new(
        ai: Arc<AiService>,
        runtime: Arc<runtime_manager::RuntimeService>,
        items: Arc<dyn ItemRepository>,
        labels: Arc<dyn LabelRepository>,
        annotations: Arc<dyn AnnotationRepository>,
        settings: Arc<dyn SettingRepository>,
        app: tauri::AppHandle,
    ) -> Self {
        Self {
            ai,
            runtime,
            items,
            labels,
            annotations,
            settings,
            app,
        }
    }

    /// One copilot chat turn. Blocking (runtime HTTP + persistence); the command
    /// runs it on a blocking thread, like the detector path.
    pub fn turn(&self, payload: CopilotTurnPayload) -> Result<CopilotTurnResult, AppError> {
        // Image (or unset, for older clients) runs the full detector/SAM/VLM path;
        // any other modality runs the LLM-only generic path (no models).
        let is_image = matches!(payload.modality.as_deref(), None | Some("") | Some("image"));

        let item = self
            .items
            .get(&payload.item_id)?
            .map(serde_json::to_value)
            .transpose()?;

        let project_id = payload
            .project_id
            .clone()
            .filter(|value| !value.is_empty())
            .or_else(|| {
                item.as_ref()
                    .and_then(|value| value_string(value, "projectId", "project_id"))
            })
            .unwrap_or_default();

        let project_labels: Vec<Value> = if project_id.is_empty() {
            Vec::new()
        } else {
            self.labels
                .list_by_project(&project_id)?
                .into_iter()
                .map(serde_json::to_value)
                .collect::<Result<_, _>>()?
        };

        let annotations: Vec<Value> = if is_image {
            self.annotations
                .list_by_item(&payload.item_id)?
                .iter()
                .map(|annotation| annotation.to_value())
                .collect()
        } else {
            Vec::new()
        };

        // Resolve the models the Python copilot may run (path-or-catalog-weight for
        // it to load; record + id reused below to persist what it returns). Only
        // for the image path — the generic path uses no detector/SAM.
        let (detector, segmentation) = if is_image {
            (
                self.ai.copilot_detector_ref(&self.app)?,
                self.ai.copilot_segmentation_ref()?,
            )
        } else {
            (None, None)
        };

        // Built-in detector to fall back to when the active model (e.g. a
        // fine-tuned one) finds nothing — only when it isn't already the built-in.
        let fallback_detector = if is_image {
            self.ai.copilot_builtin_detector_weight().filter(|weight| {
                detector
                    .as_ref()
                    .map(|d| &d.weight_or_path != weight)
                    .unwrap_or(false)
            })
        } else {
            None
        };

        let context = json!({
            "item": item,
            "projectLabels": project_labels,
            "annotations": annotations,
            "predictions": [],
            "detectorModelPath": detector.as_ref().map(|d| d.weight_or_path.clone()),
            "detectorClassNames": detector
                .as_ref()
                .map(|d| d.class_names.clone())
                .unwrap_or_default(),
            "segmentationModelPath": segmentation.as_ref().map(|s| s.weight_or_path.clone()),
            "fallbackDetectorModelPath": fallback_detector,
        });

        let request = json!({
            "payload": {
                "itemId": payload.item_id,
                "message": payload.message,
                "projectId": payload.project_id,
                "modality": payload.modality,
                "task": payload.task,
                "enabledTools": payload.enabled_tools,
                "history": payload.history,
            },
            "context": context,
            "llmSettings": self.llm_settings(),
        });

        let runtime = self.runtime.clone();
        let response: Value = tauri::async_runtime::block_on(async move {
            let client = runtime.ensure_started().await?;
            client.copilot_turn(&request).await
        })?;

        let predictions = response
            .get("predictions")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let predictions_added = self.ai.copilot_persist_predictions(
            &self.app,
            &payload.item_id,
            &project_id,
            detector.as_ref(),
            segmentation.as_ref(),
            predictions,
        )?;

        Ok(CopilotTurnResult {
            reply: str_field(&response, "reply").unwrap_or_default(),
            capability: str_field(&response, "capability").unwrap_or_else(|| "help".into()),
            predictions_added,
            findings: array_field(&response, "findings"),
            proposed_actions: array_field(&response, "proposedActions"),
        })
    }

    /// Probe a manually configured copilot server via the Python copilot. Infallible
    /// (a transport failure becomes `ok: false`), matching the old behavior.
    pub fn test_connection(&self, payload: CopilotTestPayload) -> CopilotTestResult {
        // A typed key in the payload wins; otherwise the saved keychain key.
        let api_key = payload
            .api_key
            .clone()
            .filter(|key| !key.trim().is_empty())
            .or_else(|| crate::read_secret("copilot", "apiKey").ok().flatten());
        let request = json!({ "baseUrl": payload.base_url, "apiKey": api_key });

        let runtime = self.runtime.clone();
        let result = tauri::async_runtime::block_on(async move {
            let client = runtime.ensure_started().await?;
            client.copilot_test_connection(&request).await
        });

        match result {
            Ok(value) => CopilotTestResult {
                ok: value.get("ok").and_then(Value::as_bool).unwrap_or(false),
                message: str_field(&value, "message").unwrap_or_default(),
                models: array_field(&value, "models")
                    .iter()
                    .filter_map(|model| model.as_str().map(ToString::to_string))
                    .collect(),
            },
            Err(error) => CopilotTestResult {
                ok: false,
                message: format!("Couldn't reach the local AI runtime: {error}"),
                models: Vec::new(),
            },
        }
    }

    /// The saved copilot LLM settings (Settings → AI Copilot) + keychain API key,
    /// forwarded to Python which does the discovery/resolution itself.
    fn llm_settings(&self) -> Value {
        let setting = |key: &str| {
            self.settings
                .get_by_key(&format!("copilot.{key}"))
                .ok()
                .flatten()
                .map(|setting| setting.value.trim().to_string())
                .filter(|value| !value.is_empty())
        };
        json!({
            "baseUrl": setting("baseUrl"),
            "model": setting("model"),
            "vision": setting("vision"),
            "apiKey": crate::read_secret("copilot", "apiKey").ok().flatten(),
        })
    }
}

/// Read a string field by its camelCase or snake_case key.
fn value_string(value: &Value, camel: &str, snake: &str) -> Option<String> {
    value
        .get(camel)
        .or_else(|| value.get(snake))
        .and_then(Value::as_str)
        .map(ToString::to_string)
}

fn str_field(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(Value::as_str).map(ToString::to_string)
}

fn array_field(value: &Value, key: &str) -> Vec<Value> {
    value
        .get(key)
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
}
