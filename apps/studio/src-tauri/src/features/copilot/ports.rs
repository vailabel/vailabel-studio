//! Composition-root impls of the copilot module's outbound ports.
//!
//! Binds the pure `vailabel_copilot::application` ports to the binary's
//! infrastructure: [`BinaryCopilotLlm`] owns the LLM resolution cache and wraps
//! the local OpenAI-compatible client (`domain::ai::llm`) + the keychain secret;
//! [`BinaryCopilotInference`] wraps the binary's `AiService` (the shared
//! predictions/pipeline engine, with its engine cache + `predictions:generated`
//! events) plus a cloned `AppHandle` and the typed module repositories it reads
//! from. These are the only places that know both the copilot module and the
//! inference/LLM internals.

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde_json::Value;
use vailabel_copilot::application::{BoxPrompt, CopilotInference, CopilotLlm};
use vailabel_copilot::domain::CopilotLlmConfig;
use vailabel_core::{DomainError, DomainResult};

use crate::features::ai::llm;
use crate::features::ai::model::{PipelineRunPayload, PredictionGeneratePayload};
use crate::features::ai::plugin::{self, PromptInput};
use crate::features::ai::service::AiService;
use vailabel_annotation::domain::{AnnotationRepository, LabelRepository, PredictionRepository};
use vailabel_dataset::domain::ItemRepository;
use vailabel_workspace::domain::SettingRepository;

// ───────────────────────────── LLM port ─────────────────────────────

/// How long an auto-discovered local LLM is trusted before the copilot re-probes
/// for one. Short enough to notice a server starting/stopping mid-session.
const LLM_CACHE_TTL: Duration = Duration::from_secs(30);

/// A cached result of resolving the copilot's local LLM (saved config or
/// auto-discovery), with the time it was probed and a `signature` of the saved
/// config so editing it in Settings invalidates the cache immediately.
struct LlmCacheEntry {
    config: Option<CopilotLlmConfig>,
    signature: String,
    checked_at: Instant,
}

/// [`CopilotLlm`] backed by the local OpenAI-compatible client. Owns the
/// resolution cache and reads the copilot's server settings + saved API key.
pub struct BinaryCopilotLlm {
    settings: Arc<dyn SettingRepository>,
    cache: Mutex<Option<LlmCacheEntry>>,
}

impl BinaryCopilotLlm {
    pub fn new(settings: Arc<dyn SettingRepository>) -> Self {
        Self {
            settings,
            cache: Mutex::new(None),
        }
    }

    /// Read a non-secret copilot setting (`copilot.<key>`) as a trimmed string,
    /// returning `None` when it is unset or empty.
    fn copilot_setting(&self, key: &str) -> Option<String> {
        self.settings
            .get_by_key(&format!("copilot.{key}"))
            .ok()
            .flatten()
            .map(|setting| setting.value)
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
    }
}

impl CopilotLlm for BinaryCopilotLlm {
    fn resolve(&self) -> Option<CopilotLlmConfig> {
        let base_url = self.copilot_setting("baseUrl");
        let model = self.copilot_setting("model");
        let vision_setting = self.copilot_setting("vision");
        let signature = format!(
            "{}|{}|{}",
            base_url.as_deref().unwrap_or(""),
            model.as_deref().unwrap_or(""),
            vision_setting.as_deref().unwrap_or("auto"),
        );

        if let Ok(guard) = self.cache.lock() {
            if let Some(entry) = guard.as_ref() {
                if entry.signature == signature && entry.checked_at.elapsed() < LLM_CACHE_TTL {
                    return entry.config.clone();
                }
            }
        }

        let vision_pref =
            llm::VisionPref::from_setting(vision_setting.as_deref().unwrap_or("auto"));
        let resolved = match base_url {
            // Manual config wins; fall back to discovery if it can't be resolved
            // (e.g. server down with no pinned model) so the copilot still works.
            Some(ref url) => {
                let api_key = crate::read_secret("copilot", "apiKey").ok().flatten();
                llm::configure_llm(url, model.as_deref(), vision_pref, api_key.as_deref())
                    .or_else(llm::discover_local_llm)
            }
            None => llm::discover_local_llm(),
        }
        // Honor an explicit Vision preference for *any* resolved model — including
        // an auto-discovered one — so a VLM the name heuristic misses still gets
        // the image when the user sets Vision to "Always send the image".
        .map(|mut config| {
            vision_pref.apply(&mut config.vision);
            config
        });

        if let Ok(mut guard) = self.cache.lock() {
            *guard = Some(LlmCacheEntry {
                config: resolved.clone(),
                signature,
                checked_at: Instant::now(),
            });
        }
        resolved
    }

    fn invalidate(&self) {
        if let Ok(mut guard) = self.cache.lock() {
            *guard = None;
        }
    }

    fn server_reachable(&self, base_url: &str) -> bool {
        llm::server_reachable(base_url)
    }

    fn chat(
        &self,
        config: &CopilotLlmConfig,
        system: &str,
        user_text: &str,
        image_data_url: Option<&str>,
    ) -> Result<String, String> {
        let api_key = crate::read_secret("copilot", "apiKey").ok().flatten();
        llm::chat_completion(config, api_key.as_deref(), system, user_text, image_data_url)
            .map_err(|error| error.to_string())
    }

    fn chat_json(
        &self,
        config: &CopilotLlmConfig,
        system: &str,
        user_text: &str,
    ) -> Result<String, String> {
        let api_key = crate::read_secret("copilot", "apiKey").ok().flatten();
        llm::chat_json(config, api_key.as_deref(), system, user_text)
            .map_err(|error| error.to_string())
    }

    fn image_data_url(&self, path: &str) -> Option<String> {
        llm::image_data_url(path)
    }

    fn test_connection(
        &self,
        base_url: &str,
        api_key: Option<&str>,
    ) -> Result<Vec<String>, String> {
        // A typed key in the payload wins; otherwise fall back to the saved one.
        let api_key = api_key
            .filter(|key| !key.trim().is_empty())
            .map(ToString::to_string)
            .or_else(|| crate::read_secret("copilot", "apiKey").ok().flatten());
        llm::test_connection(base_url, api_key.as_deref())
    }
}

// ─────────────────────────── Inference port ───────────────────────────

/// [`CopilotInference`] backed by the binary's `AiService`. Entity reads go
/// straight to the store; detection/segmentation delegate to the shared
/// predictions/pipeline engine (which persists drafts + emits
/// `predictions:generated` via the held `AppHandle`).
pub struct BinaryCopilotInference {
    ai: Arc<AiService>,
    images: Arc<dyn ItemRepository>,
    labels: Arc<dyn LabelRepository>,
    annotations: Arc<dyn AnnotationRepository>,
    predictions: Arc<dyn PredictionRepository>,
    app: tauri::AppHandle,
}

impl BinaryCopilotInference {
    pub fn new(
        ai: Arc<AiService>,
        images: Arc<dyn ItemRepository>,
        labels: Arc<dyn LabelRepository>,
        annotations: Arc<dyn AnnotationRepository>,
        predictions: Arc<dyn PredictionRepository>,
        app: tauri::AppHandle,
    ) -> Self {
        Self {
            ai,
            images,
            labels,
            annotations,
            predictions,
            app,
        }
    }
}

/// Map a store/persistence failure into a domain error at the boundary.
fn repo_err(error: impl ToString) -> DomainError {
    DomainError::repository(error.to_string())
}

/// Serialize a typed aggregate to plain camelCase JSON at the port boundary
/// (matches the former store's plain-serde path for labels / images).
fn to_json(value: impl serde::Serialize) -> DomainResult<Value> {
    serde_json::to_value(value).map_err(repo_err)
}

impl CopilotInference for BinaryCopilotInference {
    fn image(&self, item_id: &str) -> DomainResult<Option<Value>> {
        self.images.get(item_id)?.map(to_json).transpose()
    }

    fn project_labels(&self, project_id: &str) -> DomainResult<Vec<Value>> {
        self.labels
            .list_by_project(project_id)?
            .into_iter()
            .map(to_json)
            .collect()
    }

    fn annotations(&self, item_id: &str) -> DomainResult<Vec<Value>> {
        Ok(self
            .annotations
            .list_by_item(item_id)?
            .iter()
            .map(|a| a.to_value())
            .collect())
    }

    fn predictions(&self, item_id: &str) -> DomainResult<Vec<Value>> {
        Ok(self
            .predictions
            .list_by_item(item_id)?
            .iter()
            .map(|p| p.to_value())
            .collect())
    }

    fn detector_model_id(&self) -> DomainResult<Option<String>> {
        self.ai.resolve_model_id().map_err(repo_err)
    }

    fn detector_class_names(&self) -> Vec<String> {
        self.ai.active_detector_class_names()
    }

    fn detect(
        &self,
        item_id: &str,
        model_id: &str,
        target: Option<&str>,
    ) -> Result<Vec<Value>, String> {
        self.ai
            .generate_predictions_filtered(
                &self.app,
                PredictionGeneratePayload {
                    item_id: item_id.to_string(),
                    model_id: model_id.to_string(),
                    threshold: None,
                },
                target,
            )
            .map_err(|error| error.to_string())
    }

    fn segment_boxes(
        &self,
        item_id: &str,
        boxes: Vec<BoxPrompt>,
        target: Option<&str>,
    ) -> Result<Vec<Value>, String> {
        let sam_model_id = self
            .ai
            .resolve_segmentation_model_id()
            .map_err(|error| error.to_string())?
            .ok_or_else(|| {
                "No segmentation model is installed. Install MobileSAM on the AI Models page to \
                 outline detections."
                    .to_string()
            })?;
        let prompt = PromptInput {
            points: Vec::new(),
            boxes: boxes
                .into_iter()
                .map(|b| plugin::BoxPrompt {
                    x1: b.x1,
                    y1: b.y1,
                    x2: b.x2,
                    y2: b.y2,
                })
                .collect(),
            text: target.map(ToString::to_string),
        };
        self.ai
            .pipeline_run(
                &self.app,
                PipelineRunPayload {
                    item_id: item_id.to_string(),
                    model_id: sam_model_id,
                    registry_id: None,
                    threshold: None,
                    prompt,
                },
            )
            .map_err(|error| error.to_string())
    }
}
