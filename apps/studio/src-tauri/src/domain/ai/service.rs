use crate::domain::ai::copilot::{self, Capability, CopilotTurnResult};
use crate::domain::ai::llm;
use crate::domain::ai::model::{
    CopilotActionPayload, CopilotLlmConfig, CopilotTestPayload, CopilotTestResult,
    CopilotTurnPayload, GitHubReleaseLookupPayload, InferenceAnnotationDraft, ModelImportPayload,
    ModelInstallPayload, PipelineRunPayload, PredictionGeneratePayload,
};
use crate::domain::ai::plugin;
use crate::inference::{self, InferenceEngine};
use crate::store::EntityStore;
use crate::{
    as_object_mut, emit_domain_event, emit_domain_event_for_ids, merge_patch, normalize_entity,
    now_iso, value_string, AppError,
};
use reqwest::blocking::Client;
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::fs;
use std::io::copy;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::Manager;
use uuid::Uuid;

const APP_NAME: &str = "Vailabel Studio";
const DEFAULT_AI_LABEL_COLOR: &str = "#22c55e";
/// How long an auto-discovered local LLM is trusted before the copilot re-probes
/// for one. Short enough to notice a server starting/stopping mid-session.
const LLM_CACHE_TTL: Duration = Duration::from_secs(30);
const COPILOT_SYSTEM_PROMPT: &str = "You are the AI labeling copilot inside VaiLabel Studio, an \
image annotation tool that runs entirely on the user's machine. When an image is provided, look at \
it and answer concisely and concretely to help the user label it \u{2014} objects present, their \
attributes, and any readable text. You cannot draw boxes yourself: if the user wants annotations \
created, tell them to ask you to \u{201c}detect objects\u{201d} or \u{201c}check what I missed\u{201d}, \
which run the local detector. Keep answers short and practical.";
/// System prompt for *narration* — rephrasing a deterministic status line, not
/// chatting. Constrained so weak local models don't add greetings/preambles
/// (e.g. "Okay, I'm ready. Let's begin!") or invent objects/actions.
const NARRATION_SYSTEM_PROMPT: &str = "You rewrite one short status line from an image \
labeling tool into plain language for the user. Output ONLY the rewritten status as one or two \
sentences \u{2014} no greeting, no preamble, no \u{201c}Okay\u{201d}/\u{201c}Sure\u{201d}/\u{201c}Let's \
begin\u{201d}, no markdown, no follow-up question. State only what the status says; never invent \
objects, counts, or that boxes exist when the status says none were found.";
/// System prompt for the vision model when recommending label names. Constrained
/// so weak local VLMs return a clean class list, not a description.
const LABEL_SUGGEST_SYSTEM_PROMPT: &str = "You help a user set up an image-annotation project. \
Look at the image and list the distinct object categories worth labeling with bounding boxes. \
Reply with ONLY a comma-separated list of short, lowercase, singular class names (for example: \
car, person, traffic light, dog). No numbers, no counts, no descriptions, no markdown \u{2014} \
just the list. Give between 3 and 12 of the most useful, concrete categories.";
const LABEL_SUGGEST_USER_PROMPT: &str = "What object categories should I label in this image?";

const COCO_80_CLASS_NAMES: &[&str] = &[
    "person",
    "bicycle",
    "car",
    "motorcycle",
    "airplane",
    "bus",
    "train",
    "truck",
    "boat",
    "traffic light",
    "fire hydrant",
    "stop sign",
    "parking meter",
    "bench",
    "bird",
    "cat",
    "dog",
    "horse",
    "sheep",
    "cow",
    "elephant",
    "bear",
    "zebra",
    "giraffe",
    "backpack",
    "umbrella",
    "handbag",
    "tie",
    "suitcase",
    "frisbee",
    "skis",
    "snowboard",
    "sports ball",
    "kite",
    "baseball bat",
    "baseball glove",
    "skateboard",
    "surfboard",
    "tennis racket",
    "bottle",
    "wine glass",
    "cup",
    "fork",
    "knife",
    "spoon",
    "bowl",
    "banana",
    "apple",
    "sandwich",
    "orange",
    "broccoli",
    "carrot",
    "hot dog",
    "pizza",
    "donut",
    "cake",
    "chair",
    "couch",
    "potted plant",
    "bed",
    "dining table",
    "toilet",
    "tv",
    "laptop",
    "mouse",
    "remote",
    "keyboard",
    "cell phone",
    "microwave",
    "oven",
    "toaster",
    "sink",
    "refrigerator",
    "book",
    "clock",
    "vase",
    "scissors",
    "teddy bear",
    "hair drier",
    "toothbrush",
];

/// A cached result of resolving the copilot's local LLM (saved config or
/// auto-discovery), with the time it was probed so the copilot can re-check
/// periodically. `signature` captures the saved config so editing it in Settings
/// invalidates the cache immediately instead of waiting out the TTL.
struct LlmCacheEntry {
    config: Option<CopilotLlmConfig>,
    signature: String,
    checked_at: Instant,
}

/// One loaded inference engine, keyed by model id in [`AiService::engine_cache`].
/// Holding distinct engines side by side lets a detect→segment turn keep both the
/// detector and the SAM plugin (with its per-image embedding) resident at once.
#[allow(dead_code)] // `Detector` is only built under the inference feature.
enum CachedEngine {
    Detector(Box<dyn InferenceEngine>),
    Plugin(Box<dyn plugin::ModelPlugin>),
}

/// Max engines kept resident (detector + one prompt plugin). Bounds RAM/VRAM.
const MAX_CACHED_ENGINES: usize = 2;

/// Cap on detections auto-segmented in a chained detect → segment-each turn, so a
/// crowded image can't fan out into hundreds of decoder runs.
const MAX_SEGMENT_FANOUT: usize = 20;

/// Insert an engine under `key`, first evicting an unrelated entry if the cache is
/// at capacity. Not strict LRU — with a cap of 2 and at most a detector + a plugin
/// in flight, this only evicts when a genuinely different model is loaded.
fn cache_insert_bounded(cache: &mut HashMap<String, CachedEngine>, key: String, engine: CachedEngine) {
    if !cache.contains_key(&key) && cache.len() >= MAX_CACHED_ENGINES {
        if let Some(evict) = cache.keys().find(|existing| *existing != &key).cloned() {
            cache.remove(&evict);
        }
    }
    cache.insert(key, engine);
}

#[derive(Clone)]
pub struct AiService {
    store: Arc<dyn EntityStore>,
    /// Loaded ONNX engines keyed by model id (detector + prompt plugins), kept
    /// resident so repeated runs — and detect→segment chaining — reuse sessions
    /// and SAM's per-image embedding instead of rebuilding them.
    engine_cache: Arc<Mutex<HashMap<String, CachedEngine>>>,
    /// Last auto-discovered local LLM/VLM (or `None` if none was reachable),
    /// cached so the copilot doesn't re-probe local servers on every turn.
    llm_cache: Arc<Mutex<Option<LlmCacheEntry>>>,
}

impl AiService {
    pub fn new(store: Arc<dyn EntityStore>) -> Self {
        Self {
            store,
            engine_cache: Arc::new(Mutex::new(HashMap::new())),
            llm_cache: Arc::new(Mutex::new(None)),
        }
    }

    /// Read a non-secret copilot setting (`copilot.<key>`) as a trimmed string,
    /// returning `None` when it is unset or empty.
    fn copilot_setting(&self, key: &str) -> Option<String> {
        self.store
            .get_entity("settings", &format!("copilot.{key}"))
            .ok()
            .flatten()
            .and_then(|setting| value_string(&setting, "value", "value"))
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
    }

    /// Resolve the local OpenAI-compatible LLM/VLM the copilot should use. A
    /// server saved in Settings → AI Copilot takes priority; otherwise (or when
    /// that server can't be used) it falls back to auto-discovery. The result is
    /// cached briefly so we don't re-probe on every turn, keyed by the saved
    /// config so an edit takes effect on the next turn.
    fn resolve_llm(&self) -> Option<CopilotLlmConfig> {
        let base_url = self.copilot_setting("baseUrl");
        let model = self.copilot_setting("model");
        let vision_setting = self.copilot_setting("vision");
        let signature = format!(
            "{}|{}|{}",
            base_url.as_deref().unwrap_or(""),
            model.as_deref().unwrap_or(""),
            vision_setting.as_deref().unwrap_or("auto"),
        );

        if let Ok(guard) = self.llm_cache.lock() {
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

        if let Ok(mut guard) = self.llm_cache.lock() {
            *guard = Some(LlmCacheEntry {
                config: resolved.clone(),
                signature,
                checked_at: Instant::now(),
            });
        }
        resolved
    }

    /// Drop the cached LLM so the next turn re-discovers one — called when a
    /// request to the local server fails (server stopped, model unloaded, …).
    fn invalidate_llm(&self) {
        if let Ok(mut guard) = self.llm_cache.lock() {
            *guard = None;
        }
    }

    /// Validate a manual copilot server config (Settings → AI Copilot) by probing
    /// its `/models`. Reports the reachable models, or a clear error. A typed key
    /// in the payload is used when present, else the saved keychain key.
    pub fn copilot_test_connection(&self, payload: CopilotTestPayload) -> CopilotTestResult {
        let api_key = payload
            .api_key
            .filter(|key| !key.trim().is_empty())
            .or_else(|| crate::read_secret("copilot", "apiKey").ok().flatten());
        match llm::test_connection(&payload.base_url, api_key.as_deref()) {
            Ok(models) => {
                // A successful test means the config is usable now; drop the cache
                // so the next turn picks it up instead of waiting out the TTL.
                self.invalidate_llm();
                let count = models.len();
                CopilotTestResult {
                    ok: true,
                    message: format!(
                        "Connected \u{2014} {count} model{} available.",
                        if count == 1 { "" } else { "s" }
                    ),
                    models,
                }
            }
            Err(message) => CopilotTestResult {
                ok: false,
                message,
                models: Vec::new(),
            },
        }
    }

    pub fn list_ai_models(&self) -> Result<Vec<Value>, AppError> {
        hydrate_ai_models(self.store.as_ref(), self.store.list_entities("ai_models")?)
    }

    pub fn list_ai_models_by_project(&self, project_id: &str) -> Result<Vec<Value>, AppError> {
        hydrate_ai_models(
            self.store.as_ref(),
            self.store
                .list_by_field("ai_models", "project_id", project_id)?,
        )
    }

    pub fn save_ai_model(&self, app: &tauri::AppHandle, payload: Value) -> Result<Value, AppError> {
        let (model, action) = save_entity(self.store.as_ref(), "ai_models", payload)?;
        let model = hydrate_ai_model_entity(self.store.as_ref(), model)?;
        emit_domain_event(app, "ai_models", action, &model)?;
        Ok(model)
    }

    pub fn delete_ai_model(&self, app: &tauri::AppHandle, id: &str) -> Result<Value, AppError> {
        let model = delete_entity(self.store.as_ref(), "ai_models", id, "AI model not found")?;
        emit_domain_event(app, "ai_models", "deleted", &model)?;
        Ok(json!({ "success": true }))
    }

    pub fn set_active_model(
        &self,
        app: &tauri::AppHandle,
        model_id: &str,
    ) -> Result<Value, AppError> {
        let _ = get_entity_or_error(
            self.store.as_ref(),
            "ai_models",
            model_id,
            "AI model not found",
        )?;
        let models = self.store.list_entities("ai_models")?;

        for mut model in models {
            let current_id = value_string(&model, "id", "id").unwrap_or_default();
            {
                let object = as_object_mut(&mut model)?;
                let is_active = current_id == model_id;
                object.insert("isActive".into(), Value::Bool(is_active));
                if is_active {
                    object.insert("lastUsed".into(), Value::String(now_iso()));
                }
            }
            let normalized = normalize_entity("ai_models", model)?;
            self.store.upsert_entity("ai_models", normalized)?;
        }

        let active_model = get_entity_or_error(
            self.store.as_ref(),
            "ai_models",
            model_id,
            "AI model not found",
        )?;
        emit_domain_event(app, "ai_models", "activated", &active_model)?;
        Ok(active_model)
    }

    pub fn import_ai_model(
        &self,
        app: &tauri::AppHandle,
        payload: ModelImportPayload,
    ) -> Result<Value, AppError> {
        let source_model_path = PathBuf::from(&payload.model_file_path);
        if !source_model_path.exists() {
            return Err(AppError::Message(
                "Selected model file could not be found".into(),
            ));
        }

        let model_id = Uuid::new_v4().to_string();
        let app_dir = app.path().app_data_dir()?;
        let models_dir = app_dir.join("models").join("custom").join(&model_id);
        fs::create_dir_all(&models_dir)?;

        let model_file_name =
            file_name_from_path(&source_model_path, "Selected model file path is invalid")?;
        let target_model_path = models_dir.join(model_file_name);
        fs::copy(&source_model_path, &target_model_path)?;

        let target_config_path = if let Some(config_file_path) = payload.config_file_path.as_ref() {
            let source_config_path = PathBuf::from(config_file_path);
            if !source_config_path.exists() {
                return Err(AppError::Message(
                    "Selected config file could not be found".into(),
                ));
            }

            let config_file_name =
                file_name_from_path(&source_config_path, "Selected config file path is invalid")?;
            let target_config_path = models_dir.join(config_file_name);
            fs::copy(&source_config_path, &target_config_path)?;
            target_config_path.to_string_lossy().to_string()
        } else {
            String::new()
        };

        let model = build_ai_model_entity(AiModelEntityInput {
            model_id: &model_id,
            name: &payload.name,
            description: &payload.description,
            version: &payload.version,
            category: &payload.category,
            model_type: &payload.model_type,
            task_type: None,
            model_path: &target_model_path,
            config_path: &target_config_path,
            project_id: payload.project_id.as_ref(),
            source: "local",
            download_url: None,
            seed_metadata: None,
        })?;

        let model = self.store.upsert_entity("ai_models", model)?;
        emit_domain_event(app, "ai_models", "created", &model)?;
        Ok(model)
    }

    pub fn install_ai_model(
        &self,
        app: &tauri::AppHandle,
        payload: ModelInstallPayload,
    ) -> Result<Value, AppError> {
        let model_file_name = payload
            .file_name
            .clone()
            .filter(|value| !value.trim().is_empty())
            .or_else(|| file_name_from_url(&payload.download_url))
            .ok_or_else(|| {
                AppError::Message("Download URL did not include a valid model file name".into())
            })?;
        let inferred_path = PathBuf::from(&model_file_name);
        let (family, variant) = infer_model_family_and_variant(&payload.name, &inferred_path);

        if let Some(existing) = find_existing_model_installation(
            self.store.as_ref(),
            &payload.category,
            &family,
            &variant,
            &payload.version,
        )? {
            return Ok(existing);
        }

        let model_id = Uuid::new_v4().to_string();
        let app_dir = app.path().app_data_dir()?;
        let models_dir = app_dir.join("models").join("catalog").join(&model_id);
        fs::create_dir_all(&models_dir)?;

        let target_model_path = models_dir.join(&model_file_name);
        let install_result = (|| -> Result<Value, AppError> {
            download_model_asset(&payload.download_url, &target_model_path)?;

            // Multi-file models (SAM = encoder + decoder, open-vocab = model +
            // tokenizer) pull their extra components into the same directory; the
            // plugin resolves them later by their conventional filenames. A failure
            // here drops into the cleanup below, which removes the whole dir.
            for component in &payload.components {
                let component_file_name =
                    resolve_component_file_name(component.file_name.as_deref(), &component.url)
                        .ok_or_else(|| {
                            AppError::Message(format!(
                                "Model component download URL did not include a valid file name: {}",
                                component.url
                            ))
                        })?;
                download_model_asset(&component.url, &models_dir.join(&component_file_name))?;
            }

            let model = build_ai_model_entity(AiModelEntityInput {
                model_id: &model_id,
                name: &payload.name,
                description: &payload.description,
                version: &payload.version,
                category: &payload.category,
                model_type: &payload.model_type,
                task_type: payload.task_type.as_deref(),
                model_path: &target_model_path,
                config_path: "",
                project_id: payload.project_id.as_ref(),
                source: "catalog",
                download_url: Some(&payload.download_url),
                seed_metadata: None,
            })?;

            let model = self.store.upsert_entity("ai_models", model)?;
            emit_domain_event(app, "ai_models", "created", &model)?;
            Ok(model)
        })();

        if install_result.is_err() {
            let _ = fs::remove_file(&target_model_path);
            let _ = fs::remove_dir_all(&models_dir);
        }

        install_result
    }

    pub fn list_github_releases(
        &self,
        payload: GitHubReleaseLookupPayload,
    ) -> Result<Vec<Value>, AppError> {
        let client = Client::builder()
            .user_agent(format!("{APP_NAME}/{}", env!("CARGO_PKG_VERSION")))
            // Fail fast instead of hanging the UI forever when GitHub is
            // unreachable / offline / rate-limited.
            .connect_timeout(std::time::Duration::from_secs(8))
            .timeout(std::time::Duration::from_secs(15))
            .build()?;
        let url = format!(
            "https://api.github.com/repos/{}/{}/releases?per_page=20",
            payload.owner, payload.repo
        );
        let response = client
            .get(url)
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .send()?
            .error_for_status()?;
        let releases: Value = response.json()?;
        let releases = releases
            .as_array()
            .ok_or_else(|| AppError::Message("GitHub releases response was invalid".into()))?;

        Ok(releases
            .iter()
            .filter_map(|release: &Value| {
                let id = release.get("id")?.as_i64()?;
                let tag_name = release.get("tag_name")?.as_str()?.to_string();
                let name = release
                    .get("name")
                    .and_then(Value::as_str)
                    .unwrap_or(&tag_name)
                    .to_string();
                let draft = release
                    .get("draft")
                    .and_then(Value::as_bool)
                    .unwrap_or(false);
                let prerelease = release
                    .get("prerelease")
                    .and_then(Value::as_bool)
                    .unwrap_or(false);
                let published_at = release
                    .get("published_at")
                    .and_then(Value::as_str)
                    .map(ToString::to_string);
                let assets = release
                    .get("assets")
                    .and_then(Value::as_array)
                    .map(|assets: &Vec<Value>| {
                        assets
                            .iter()
                            .filter_map(|asset: &Value| {
                                let name = asset.get("name")?.as_str()?;
                                if !name.to_lowercase().ends_with(".onnx") {
                                    return None;
                                }
                                Some(json!({
                                  "id": asset.get("id")?.as_i64()?,
                                  "name": name,
                                  "browserDownloadUrl": asset.get("browser_download_url")?.as_str()?,
                                  "size": asset.get("size").and_then(Value::as_u64),
                                  "contentType": asset.get("content_type").and_then(Value::as_str),
                                }))
                            })
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_default();

                Some(json!({
                  "id": id,
                  "tagName": tag_name,
                  "name": name,
                  "draft": draft,
                  "prerelease": prerelease,
                  "publishedAt": published_at,
                  "assets": assets,
                }))
            })
            .collect())
    }

    pub fn list_predictions_by_image(&self, image_id: &str) -> Result<Vec<Value>, AppError> {
        Ok(self
            .store
            .list_by_field("predictions", "image_id", image_id)?)
    }

    pub fn generate_predictions(
        &self,
        app: &tauri::AppHandle,
        payload: PredictionGeneratePayload,
    ) -> Result<Vec<Value>, AppError> {
        self.generate_predictions_filtered(app, payload, None)
    }

    /// Run the active detector, optionally keeping only detections whose class
    /// matches `class_filter` (case-insensitive, singular/plural tolerant). The
    /// filter powers prompt-to-detect ("find all cars") on a closed-vocabulary
    /// model — and on an open-vocabulary one (YOLO-World) it narrows the broad
    /// vocabulary to the requested phrase. `None` keeps every detection.
    fn generate_predictions_filtered(
        &self,
        app: &tauri::AppHandle,
        payload: PredictionGeneratePayload,
        class_filter: Option<&str>,
    ) -> Result<Vec<Value>, AppError> {
        let image_id = payload.image_id.clone();
        let model_id = payload.model_id.clone();
        let image =
            get_entity_or_error(self.store.as_ref(), "images", &image_id, "Image not found")?;
        let hydrated_model = hydrate_ai_model_entity(
            self.store.as_ref(),
            get_entity_or_error(
                self.store.as_ref(),
                "ai_models",
                &model_id,
                "Selected AI model was not found",
            )?,
        )?;
        let model = upgrade_model_for_local_inference(self.store.as_ref(), hydrated_model.clone())?;
        if model != hydrated_model {
            emit_domain_event(app, "ai_models", "updated", &model)?;
        }

        let model_path = value_string(&model, "modelPath", "model_path").unwrap_or_default();
        if model_path.is_empty() {
            return Err(AppError::Message(
                "Selected AI model does not have a local file path".into(),
            ));
        }
        if !Path::new(&model_path).exists() {
            return Err(AppError::Message(
                "Selected AI model file could not be found on disk".into(),
            ));
        }

        let project_id = value_string(&image, "projectId", "project_id").unwrap_or_default();
        let labels = if project_id.is_empty() {
            Vec::new()
        } else {
            self.store
                .list_by_field("labels", "project_id", &project_id)?
        };

        // A task-specific export (…-cls / -seg / -pose) cannot run the box
        // detector even if it was installed under the "detection" category (e.g. a
        // `-cls` asset picked from a detection catalog entry). Catch it by filename
        // so the user gets a clear message instead of zero detections.
        if let Some(task) = task_suffix(Path::new(&model_path)) {
            return Err(AppError::Message(non_detection_reason(task)));
        }

        let unsupported_reason = model
            .get("modelMetadata")
            .and_then(Value::as_object)
            .and_then(|metadata| metadata.get("unsupportedReason"))
            .and_then(Value::as_str)
            .map(ToString::to_string)
            .filter(|value| !value.trim().is_empty());
        if let Some(reason) = unsupported_reason {
            return Err(AppError::Message(reason));
        }

        let class_names = model
            .get("modelMetadata")
            .and_then(extract_class_names_from_value)
            .unwrap_or_default();

        #[cfg(feature = "yolo-inference")]
        let (drafts, metrics) = {
            let mut cache = self
                .engine_cache
                .lock()
                .map_err(|_| AppError::Message("Engine cache is unavailable".into()))?;

            let needs_build = !matches!(cache.get(&model_id), Some(CachedEngine::Detector(_)));
            if needs_build {
                let engine = Box::new(inference::YoloEngine::new(&model_path, class_names)?);
                cache_insert_bounded(&mut cache, model_id.clone(), CachedEngine::Detector(engine));
            }

            match cache.get_mut(&model_id) {
                Some(CachedEngine::Detector(engine)) => {
                    engine.predict(&image, &model, &labels, payload.threshold.unwrap_or(0.5))?
                }
                _ => return Err(AppError::Message("Failed to initialize inference engine".into())),
            }
        };

        #[cfg(not(feature = "yolo-inference"))]
        return Err(AppError::Message(
            "This desktop build does not include local ONNX inference support.".into(),
        ));

        // Prompt-to-detect: keep only the requested class. On an open-vocab model
        // this narrows its broad vocabulary; on a closed-vocab one it filters COCO.
        let drafts = match class_filter {
            Some(target) => drafts
                .into_iter()
                .filter(|draft| draft_matches_class(draft, target))
                .collect(),
            None => drafts,
        };

        self.persist_drafts(
            app,
            &image_id,
            &project_id,
            &model,
            &model_id,
            &labels,
            drafts,
            &metrics.backend,
            metrics.infer_ms,
            true,
        )
    }

    /// Write inference drafts (boxes/polygons) as `predictions` for the canvas
    /// review loop, then emit the `predictions:generated` domain event. Shared by
    /// the closed-vocab detector ([`Self::generate_predictions`]) and the
    /// prompt-driven plugin path ([`Self::pipeline_run`]).
    ///
    /// When `replace_for_model` is true, existing predictions from the same
    /// `model_id` on this image are cleared first (the detector replaces its prior
    /// run); when false the drafts are appended (e.g. click-to-segment adds a
    /// polygon without wiping detection boxes).
    #[allow(clippy::too_many_arguments)]
    fn persist_drafts(
        &self,
        app: &tauri::AppHandle,
        image_id: &str,
        project_id: &str,
        model: &Value,
        model_id: &str,
        labels: &[Value],
        drafts: Vec<InferenceAnnotationDraft>,
        backend: &str,
        infer_ms: u128,
        replace_for_model: bool,
    ) -> Result<Vec<Value>, AppError> {
        if replace_for_model {
            let existing_predictions =
                self.store.list_by_field("predictions", "image_id", image_id)?;
            for prediction_id in prediction_ids_for_replacement(&existing_predictions, model_id) {
                self.store.delete_entity("predictions", &prediction_id)?;
            }
        }

        let mut predictions = Vec::new();
        let model_version = value_string(model, "modelVersion", "model_version")
            .unwrap_or_else(|| value_string(model, "version", "version").unwrap_or_default());
        let model_family = value_string(model, "family", "family").unwrap_or_default();
        let model_variant = value_string(model, "variant", "variant").unwrap_or_default();

        for draft in drafts {
            let resolved_label = resolve_prediction_label(labels, &draft);
            let label_id = resolved_label.label_id.clone();
            let label_name = resolved_label.label_name.clone();
            let label_color = resolved_label.label_color.clone();
            let prediction_color = label_color.clone();
            let result_type = if draft.annotation_type == "polygon" {
                "polygonlabels"
            } else {
                "rectanglelabels"
            };
            let prediction_name = resolved_label
                .label_name
                .clone()
                .unwrap_or_else(|| draft.name.clone());
            let prediction = normalize_entity(
                "predictions",
                json!({
                  "name": prediction_name,
                  "type": draft.annotation_type,
                  "coordinates": draft.coordinates,
                  "confidence": draft.confidence,
                  "labelId": label_id.clone(),
                  "label_id": label_id,
                  "labelName": label_name.clone(),
                  "label_name": label_name,
                  "labelColor": label_color.clone(),
                  "label_color": label_color,
                  "color": prediction_color,
                  "modelId": model_id.to_string(),
                  "model_id": model_id.to_string(),
                  "imageId": image_id.to_string(),
                  "image_id": image_id.to_string(),
                  "projectId": if project_id.is_empty() { Value::Null } else { Value::String(project_id.to_string()) },
                  "project_id": if project_id.is_empty() { Value::Null } else { Value::String(project_id.to_string()) },
                  "isAIGenerated": true,
                  "backend": backend,
                  "inferenceMs": infer_ms,
                  "modelVersion": model_version.clone(),
                  "model_version": model_version.clone(),
                  "family": model_family.clone(),
                  "variant": model_variant.clone(),
                  "fromName": "label",
                  "from_name": "label",
                  "toName": "image",
                  "to_name": "image",
                  "resultType": result_type,
                  "result_type": result_type,
                }),
            )?;
            let prediction = self.store.upsert_entity("predictions", prediction)?;
            predictions.push(prediction);
        }

        emit_domain_event_for_ids(
            app,
            "predictions",
            "generated",
            image_id.to_string(),
            if project_id.is_empty() {
                None
            } else {
                Some(project_id.to_string())
            },
            Some(image_id.to_string()),
        )?;

        Ok(predictions)
    }

    /// Run a prompt-driven model plugin (SAM segment, open-vocab detect, …) on one
    /// image and persist its drafts as predictions. This is the capability-aware
    /// counterpart to [`Self::generate_predictions`]: it resolves a
    /// [`crate::domain::ai::plugin::ModelPlugin`] via [`plugin::plugin_for`] and
    /// passes the user's [`PromptInput`] (points/boxes/text) through to it.
    pub fn pipeline_run(
        &self,
        app: &tauri::AppHandle,
        payload: PipelineRunPayload,
    ) -> Result<Vec<Value>, AppError> {
        let image_id = payload.image_id.clone();
        let model_id = payload.model_id.clone();
        let image =
            get_entity_or_error(self.store.as_ref(), "images", &image_id, "Image not found")?;
        let model = hydrate_ai_model_entity(
            self.store.as_ref(),
            get_entity_or_error(
                self.store.as_ref(),
                "ai_models",
                &model_id,
                "Selected AI model was not found",
            )?,
        )?;

        let image_path = value_string(&image, "path", "path").ok_or_else(|| {
            AppError::Message("Image path is unavailable for AI annotation".into())
        })?;

        let project_id = value_string(&image, "projectId", "project_id").unwrap_or_default();
        let labels = if project_id.is_empty() {
            Vec::new()
        } else {
            self.store.list_by_field("labels", "project_id", &project_id)?
        };

        let registry_id = payload
            .registry_id
            .clone()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| registry_id_for_model(&model));

        let request = plugin::PipelineRequest {
            image_path: &image_path,
            model: &model,
            labels: &labels,
            threshold: payload.threshold.unwrap_or(0.5),
            prompt: payload.prompt,
        };

        let started_at = Instant::now();
        let drafts = {
            let mut cache = self
                .engine_cache
                .lock()
                .map_err(|_| AppError::Message("Engine cache is unavailable".into()))?;

            // Reuse the cached plugin instance for this model so SAM's per-image
            // embedding survives between clicks; build it on first use.
            let needs_build = !matches!(cache.get(&model_id), Some(CachedEngine::Plugin(_)));
            if needs_build {
                cache_insert_bounded(
                    &mut cache,
                    model_id.clone(),
                    CachedEngine::Plugin(plugin::plugin_for(&registry_id)),
                );
            }

            match cache.get_mut(&model_id) {
                Some(CachedEngine::Plugin(engine)) => engine.run(&request)?,
                _ => {
                    return Err(AppError::Message(
                        "Failed to initialize the model plugin".into(),
                    ))
                }
            }
        };
        let infer_ms = started_at.elapsed().as_millis();

        // Prompt-driven runs append (a click adds one polygon); they don't wipe the
        // detector's boxes on the image.
        self.persist_drafts(
            app,
            &image_id,
            &project_id,
            &model,
            &model_id,
            &labels,
            drafts,
            "ort",
            infer_ms,
            false,
        )
    }

    pub fn accept_prediction(
        &self,
        app: &tauri::AppHandle,
        prediction_id: &str,
        label_id_override: Option<&str>,
    ) -> Result<Value, AppError> {
        let prediction = get_entity_or_error(
            self.store.as_ref(),
            "predictions",
            prediction_id,
            "Prediction not found",
        )?;

        // If the user picked a different label in the review panel, use it;
        // otherwise resolve (or create) the label the model predicted.
        let (label, created_label) = match label_id_override
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            Some(label_id) => {
                let label = get_entity_or_error(
                    self.store.as_ref(),
                    "labels",
                    label_id,
                    "Selected label was not found",
                )?;
                (Some(label), None)
            }
            None => ensure_prediction_label(self.store.as_ref(), &prediction)?,
        };

        let label_id = label
            .as_ref()
            .and_then(|value| value_string(value, "id", "id"));
        let label_name = label
            .as_ref()
            .and_then(|value| value_string(value, "name", "name"));
        let label_color = label
            .as_ref()
            .and_then(|value| value_string(value, "color", "color"))
            .or_else(|| value_string(&prediction, "labelColor", "label_color"))
            .unwrap_or_else(|| DEFAULT_AI_LABEL_COLOR.into());
        // The annotation takes the (possibly corrected) label's name.
        let annotation_name = label_name
            .clone()
            .or_else(|| value_string(&prediction, "name", "name"))
            .unwrap_or_else(|| "Prediction".into());

        let annotation = normalize_entity(
            "annotations",
            json!({
              "name": annotation_name,
              "type": value_string(&prediction, "type", "type").unwrap_or_else(|| "box".into()),
              "coordinates": prediction.get("coordinates").cloned().unwrap_or_else(|| json!([])),
              "imageId": value_string(&prediction, "imageId", "image_id"),
              "image_id": value_string(&prediction, "imageId", "image_id"),
              "projectId": value_string(&prediction, "projectId", "project_id"),
              "project_id": value_string(&prediction, "projectId", "project_id"),
              "labelId": label_id.clone(),
              "label_id": label_id,
              "color": label_color,
              "isAIGenerated": true,
            }),
        )?;
        let annotation = self.store.upsert_entity("annotations", annotation)?;
        self.store.delete_entity("predictions", prediction_id)?;

        if let Some(created_label) = created_label {
            emit_domain_event(app, "labels", "created", &created_label)?;
        }
        emit_domain_event(app, "annotations", "created", &annotation)?;
        emit_domain_event(app, "predictions", "accepted", &prediction)?;

        Ok(annotation)
    }

    pub fn reject_prediction(
        &self,
        app: &tauri::AppHandle,
        prediction_id: &str,
    ) -> Result<Value, AppError> {
        let prediction = delete_entity(
            self.store.as_ref(),
            "predictions",
            prediction_id,
            "Prediction not found",
        )?;
        emit_domain_event(app, "predictions", "rejected", &prediction)?;
        Ok(json!({ "success": true }))
    }

    /// Pick a detection model: the active one if set, otherwise the first
    /// installed model. This removes the "activate one first" friction — if a
    /// model exists at all, the copilot just uses it.
    /// Class names of the active detection model, for routing-vocab class
    /// extraction. Best-effort: returns empty when there's no model or metadata.
    fn active_detector_class_names(&self) -> Vec<String> {
        let Ok(Some(model_id)) = self.resolve_model_id() else {
            return Vec::new();
        };
        let Ok(model) =
            get_entity_or_error(self.store.as_ref(), "ai_models", &model_id, "AI model not found")
        else {
            return Vec::new();
        };
        let Ok(model) = hydrate_ai_model_entity(self.store.as_ref(), model) else {
            return Vec::new();
        };
        model
            .get("modelMetadata")
            .and_then(extract_class_names_from_value)
            .unwrap_or_default()
    }

    fn resolve_model_id(&self) -> Result<Option<String>, AppError> {
        let models = self.store.list_entities("ai_models")?;
        if let Some(model) = models.iter().find(|model| {
            model
                .get("isActive")
                .and_then(Value::as_bool)
                .unwrap_or(false)
        }) {
            return Ok(value_string(model, "id", "id"));
        }
        Ok(models.first().and_then(|model| value_string(model, "id", "id")))
    }

    /// Rephrase a deterministic detector result through the local LLM so the
    /// copilot "responds" conversationally. The detection itself is always YOLO;
    /// the LLM only narrates. Falls back to `fallback` if no LLM is configured or
    /// the call fails.
    fn narrate(
        &self,
        llm: Option<&CopilotLlmConfig>,
        instruction: &str,
        fallback: String,
    ) -> String {
        let Some(config) = llm else {
            return fallback;
        };
        let api_key = crate::read_secret("copilot", "apiKey").ok().flatten();
        match llm::chat_completion(
            config,
            api_key.as_deref(),
            NARRATION_SYSTEM_PROMPT,
            instruction,
            None,
        ) {
            Ok(text) => text,
            Err(_) => {
                if !llm::server_reachable(&config.base_url) {
                    self.invalidate_llm();
                }
                fallback
            }
        }
    }

    /// One copilot chat turn: route the message to a capability and dispatch.
    pub fn copilot_turn(
        &self,
        app: &tauri::AppHandle,
        payload: CopilotTurnPayload,
    ) -> Result<CopilotTurnResult, AppError> {
        let image = get_entity_or_error(
            self.store.as_ref(),
            "images",
            &payload.image_id,
            "Image not found",
        )?;
        let project_id = payload
            .project_id
            .clone()
            .filter(|value| !value.is_empty())
            .or_else(|| value_string(&image, "projectId", "project_id"))
            .unwrap_or_default();
        let labels = if project_id.is_empty() {
            Vec::new()
        } else {
            self.store.list_by_field("labels", "project_id", &project_id)?
        };
        let label_names: Vec<String> = labels
            .iter()
            .filter_map(|label| value_string(label, "name", "name"))
            .collect();

        // Route against project labels *and* the active detector's class names, so
        // "find all cars" extracts the "car" target even before the project has a
        // matching label (closed-vocab COCO or an open-vocab model's vocabulary).
        let mut vocab = label_names.clone();
        vocab.extend(self.active_detector_class_names());
        // The copilot auto-discovers a local LLM/VLM and picks the model itself.
        let llm = self.resolve_llm();
        let llm = llm.as_ref();

        // Orchestrate: the local LLM turns the message into a validated plan (which
        // may chain steps, e.g. detect → segment-each). When the LLM is absent or
        // its output is unusable, fall back to the deterministic keyword router, so
        // the orchestrator can only ever improve on today's behavior.
        let mut plan = self
            .plan_message(&payload.message, &vocab, llm)
            .unwrap_or_else(|| copilot::route_to_plan(&payload.message, &vocab));

        // Honor the user's Tools menu: drop any planned step for a tool they
        // turned off, so a disabled tool never runs even if the message asks.
        let enabled = payload.enabled_tools.as_deref();
        plan.steps
            .retain(|step| copilot::tool_enabled(step.capability.tool_id(), enabled));

        if plan.steps.is_empty() {
            // Everything this message routed to is off — re-route once to name the
            // intended tool, and either run it (if it's actually on) or explain.
            let intent = copilot::route(&payload.message, &vocab);
            if copilot::tool_enabled(intent.capability.as_str(), enabled) {
                return self.dispatch_intent(
                    app, &intent, &image, &payload.image_id, &payload.message, llm,
                );
            }
            return Ok(CopilotTurnResult::reply_only(
                &Capability::Help,
                copilot::disabled_tools_reply(enabled),
            ));
        }

        if plan.steps.len() == 1 {
            // Single step → reuse the existing per-capability dispatch unchanged.
            let intent = plan.steps[0].to_routed_intent();
            return self.dispatch_intent(app, &intent, &image, &payload.image_id, &payload.message, llm);
        }

        self.execute_plan(app, &plan, &image, &payload.image_id, &payload.message, llm)
    }

    /// Ask the local LLM to plan the turn as validated steps. Returns `None` when
    /// no LLM is configured/reachable or its output isn't a usable plan, so the
    /// caller falls back to deterministic routing.
    fn plan_message(
        &self,
        message: &str,
        vocab: &[String],
        llm: Option<&CopilotLlmConfig>,
    ) -> Option<copilot::Plan> {
        let config = llm?;
        let api_key = crate::read_secret("copilot", "apiKey").ok().flatten();
        let user = copilot::planner_user_prompt(message, vocab);
        let raw = match llm::chat_json(
            config,
            api_key.as_deref(),
            copilot::PLANNER_SYSTEM_PROMPT,
            &user,
        ) {
            Ok(text) => text,
            Err(_) => {
                if !llm::server_reachable(&config.base_url) {
                    self.invalidate_llm();
                }
                return None;
            }
        };
        copilot::parse_plan(&raw)
    }

    /// Dispatch one routed capability to its handler (the deterministic per-turn
    /// path, shared by single-step plans and the multi-step executor).
    fn dispatch_intent(
        &self,
        app: &tauri::AppHandle,
        intent: &copilot::RoutedIntent,
        image: &Value,
        image_id: &str,
        message: &str,
        llm: Option<&CopilotLlmConfig>,
    ) -> Result<CopilotTurnResult, AppError> {
        match intent.capability {
            // Grounding stays deterministic — the detector, never the LLM.
            Capability::Detect => self.copilot_detect(app, intent, image_id, llm),
            Capability::Qa => self.copilot_qa(app, intent, image_id, llm),
            // Label-name recommendation: gather names from the vision model and/or
            // the detector and offer them as one-click "add label" actions.
            Capability::SuggestLabels => self.copilot_suggest_labels(app, intent, image, image_id, llm),
            Capability::Segment => Ok(CopilotTurnResult::reply_only(
                &intent.capability,
                "Click an object (or draw a box) on the canvas and I\u{2019}ll outline it with \
                 SAM. To outline detections in one go, ask me to \u{201c}find all cars and outline \
                 them\u{201d}.",
            )),
            Capability::Summarize => Ok(CopilotTurnResult::reply_only(
                &intent.capability,
                "Open the Dataset Intelligence page to run a full dataset analysis \u{2014} class \
                 balance, image counts, and quality checks.",
            )),
            // Conversational + vision: route to the local LLM when configured,
            // otherwise point the user at the detector / model settings.
            Capability::Describe | Capability::Ocr | Capability::Help => match llm {
                Some(config) if config.vision || matches!(intent.capability, Capability::Help) => {
                    self.copilot_chat(intent, image, message, config)
                }
                // A local model is up but can't see images: don't let a text-only
                // model hallucinate a description/OCR — ask for a vision model.
                Some(_) => Ok(CopilotTurnResult::reply_only(
                    &intent.capability,
                    "I found a local model, but I don\u{2019}t think it can see images. If it \
                     actually is a vision model, set Vision to \u{201c}Always send the image\u{201d} \
                     in Settings \u{2192} AI Copilot and ask again. Otherwise load a vision model \
                     (look for a \u{201c}-VL\u{201d}, LLaVA, or Moondream model in LM Studio or \
                     Ollama). For now I can still run the detector \u{2014} try \u{201c}detect \
                     objects\u{201d} or \u{201c}check what I missed\u{201d}.",
                )),
                None => Ok(CopilotTurnResult::reply_only(
                    &intent.capability,
                    match &intent.capability {
                        Capability::Help => "I can label this image with your local detector \u{2014} \
                            try \u{201c}detect objects\u{201d}, \u{201c}find all cars\u{201d}, or \
                            \u{201c}check what I missed\u{201d}. To describe images, read text, or \
                            chat, start a local model server (LM Studio, Ollama, or llama.cpp) and \
                            I\u{2019}ll pick it up automatically.",
                        _ => "Describing images and reading text needs a local vision model. Start a \
                            local model server (LM Studio, Ollama, or llama.cpp) and I\u{2019}ll use \
                            it automatically \u{2014} or run your detector now with \u{201c}detect \
                            objects\u{201d} or \u{201c}check what I missed\u{201d}.",
                    },
                )),
            },
        }
    }

    /// Run a multi-step plan, chaining detect → segment-each (boxes from the detect
    /// step feed SAM). Accumulates predictions, findings and actions into one
    /// result; other capabilities reuse [`Self::dispatch_intent`].
    fn execute_plan(
        &self,
        app: &tauri::AppHandle,
        plan: &copilot::Plan,
        image: &Value,
        image_id: &str,
        message: &str,
        llm: Option<&CopilotLlmConfig>,
    ) -> Result<CopilotTurnResult, AppError> {
        let mut predictions_added = 0usize;
        let mut findings = Vec::new();
        let mut proposed_actions = Vec::new();
        let mut reply_parts: Vec<String> = Vec::new();
        let mut last_detection_target: Option<String> = None;

        for step in &plan.steps {
            if matches!(
                step.capability,
                copilot::PlanCapability::SegmentEachDetection
            ) {
                let boxes = self.detection_boxes(image_id)?;
                if boxes.is_empty() {
                    reply_parts.push("There were no detections to outline.".into());
                    continue;
                }
                match self.segment_boxes(app, image_id, boxes, last_detection_target.as_deref()) {
                    Ok(polygons) => {
                        predictions_added += polygons.len();
                        reply_parts
                            .push(format!("Outlined {} detection(s) as polygons.", polygons.len()));
                    }
                    Err(error) => {
                        reply_parts.push(format!("I couldn't outline the detections: {error}"))
                    }
                }
                continue;
            }

            let intent = step.to_routed_intent();
            if step.is_detect() {
                last_detection_target = intent.target.clone();
            }
            let result = self.dispatch_intent(app, &intent, image, image_id, message, llm)?;
            predictions_added += result.predictions_added;
            findings.extend(result.findings);
            proposed_actions.extend(result.proposed_actions);
            if !result.reply.trim().is_empty() {
                reply_parts.push(result.reply);
            }
        }

        Ok(CopilotTurnResult {
            reply: if reply_parts.is_empty() {
                "Done.".to_string()
            } else {
                reply_parts.join(" ")
            },
            capability: "plan".to_string(),
            predictions_added,
            findings,
            proposed_actions,
        })
    }

    /// The image's current detection boxes (highest-confidence first, capped), for
    /// feeding a segment-each step. Polygons are skipped.
    fn detection_boxes(&self, image_id: &str) -> Result<Vec<plugin::BoxPrompt>, AppError> {
        let predictions = self.store.list_by_field("predictions", "image_id", image_id)?;
        let mut scored: Vec<(f32, plugin::BoxPrompt)> = predictions
            .iter()
            .filter(|prediction| {
                value_string(prediction, "type", "type").as_deref() != Some("polygon")
            })
            .filter_map(|prediction| {
                let bbox = copilot::bbox_from_value(prediction)?;
                let confidence = prediction
                    .get("confidence")
                    .and_then(Value::as_f64)
                    .unwrap_or(0.0) as f32;
                Some((
                    confidence,
                    plugin::BoxPrompt {
                        x1: bbox[0],
                        y1: bbox[1],
                        x2: bbox[2],
                        y2: bbox[3],
                    },
                ))
            })
            .collect();
        scored.sort_by(|a, b| b.0.total_cmp(&a.0));
        Ok(scored
            .into_iter()
            .take(MAX_SEGMENT_FANOUT)
            .map(|(_, bbox)| bbox)
            .collect())
    }

    /// Segment each box with the installed SAM model, surfacing polygon predictions.
    fn segment_boxes(
        &self,
        app: &tauri::AppHandle,
        image_id: &str,
        boxes: Vec<plugin::BoxPrompt>,
        target: Option<&str>,
    ) -> Result<Vec<Value>, AppError> {
        let sam_model_id = self.resolve_segmentation_model_id()?.ok_or_else(|| {
            AppError::Message(
                "No segmentation model is installed. Install MobileSAM on the AI Models page to \
                 outline detections."
                    .into(),
            )
        })?;
        let prompt = plugin::PromptInput {
            points: Vec::new(),
            boxes,
            text: target.map(ToString::to_string),
        };
        self.pipeline_run(
            app,
            PipelineRunPayload {
                image_id: image_id.to_string(),
                model_id: sam_model_id,
                registry_id: None,
                threshold: None,
                prompt,
            },
        )
    }

    /// Id of an installed segmentation (SAM) model, if any.
    fn resolve_segmentation_model_id(&self) -> Result<Option<String>, AppError> {
        let models = self.store.list_entities("ai_models")?;
        Ok(models
            .iter()
            .find(|model| matches!(registry_id_for_model(model).as_str(), "mobile-sam" | "sam2"))
            .and_then(|model| value_string(model, "id", "id")))
    }

    /// Conversational/vision reply via the configured local LLM. Includes the
    /// current image as a vision part when the model supports it.
    fn copilot_chat(
        &self,
        intent: &copilot::RoutedIntent,
        image: &Value,
        message: &str,
        config: &CopilotLlmConfig,
    ) -> Result<CopilotTurnResult, AppError> {
        let api_key = crate::read_secret("copilot", "apiKey").ok().flatten();
        let image_url = if config.vision {
            value_string(image, "path", "path").and_then(|path| llm::image_data_url(&path))
        } else {
            None
        };

        // A failed LLM call is surfaced as the reply text, not a hard error, so
        // the chat keeps working when the local server is down or misconfigured.
        let reply = match llm::chat_completion(
            config,
            api_key.as_deref(),
            COPILOT_SYSTEM_PROMPT,
            message,
            image_url.as_deref(),
        ) {
            Ok(text) => text,
            Err(error) => {
                // Only forget the server if it's actually gone; an HTTP or content
                // error from a healthy server shouldn't force a re-discovery sweep.
                if !llm::server_reachable(&config.base_url) {
                    self.invalidate_llm();
                }
                error.to_string()
            }
        };
        Ok(CopilotTurnResult::reply_only(&intent.capability, reply))
    }

    fn copilot_detect(
        &self,
        app: &tauri::AppHandle,
        intent: &copilot::RoutedIntent,
        image_id: &str,
        llm: Option<&CopilotLlmConfig>,
    ) -> Result<CopilotTurnResult, AppError> {
        let model_id = match self.resolve_model_id()? {
            Some(id) => id,
            None => {
                return Ok(CopilotTurnResult::reply_only(
                    &intent.capability,
                    "I don't have a detection model to use yet. Open the AI Models page and import \
                     or install one (e.g. a YOLO model), then ask me to detect again.",
                ))
            }
        };

        // A *specific* class narrows the detector ("find all cars" → cars only);
        // a generic word ("detect objects", "everything") must NOT filter — the
        // orchestrator sometimes emits target "object(s)", which matches no real
        // class and would otherwise drop every detection to zero.
        let effective_target = intent
            .target
            .as_deref()
            .map(str::trim)
            .filter(|target| !target.is_empty() && !is_generic_detect_target(target));

        let predictions = match self.generate_predictions_filtered(
            app,
            PredictionGeneratePayload {
                image_id: image_id.to_string(),
                model_id,
                threshold: None,
            },
            effective_target,
        ) {
            Ok(predictions) => predictions,
            Err(error) => {
                return Ok(CopilotTurnResult::reply_only(
                    &intent.capability,
                    format!("I couldn't run the detector: {error}"),
                ))
            }
        };

        let count = predictions.len();
        if count == 0 {
            // Don't narrate the empty case: a weak local model tends to hallucinate
            // "boxes are on the canvas" even when nothing was found. Return a clear,
            // deterministic message instead.
            let reply = match effective_target {
                Some(target) => format!(
                    "I didn't find any \u{201c}{target}\u{201d} above the confidence threshold on \
                     this image."
                ),
                None => "I didn't find any objects above the confidence threshold. This detector \
                         recognizes the 80 common COCO classes (people, vehicles, animals, everyday \
                         objects) \u{2014} try an image with those, or a different model."
                    .to_string(),
            };
            return Ok(CopilotTurnResult {
                reply,
                capability: intent.capability.as_str().to_string(),
                predictions_added: 0,
                findings: Vec::new(),
                proposed_actions: Vec::new(),
            });
        }

        let summary = summarize_by_class(&predictions);
        let fallback = format!(
            "Detected {count} object(s) ({summary}). They're on the canvas as predictions \u{2014} \
             accept the ones you want to keep."
        );
        // YOLO did the detection; let the copilot model phrase the (non-empty) result.
        let instruction = format!(
            "The local detector found {count} objects on the image: {summary}. They are now on the \
             canvas as predictions to accept or reject. Rewrite that as one short sentence. Do not \
             invent objects beyond this list."
        );
        let reply = self.narrate(llm, &instruction, fallback);

        Ok(CopilotTurnResult {
            reply,
            capability: intent.capability.as_str().to_string(),
            predictions_added: count,
            findings: Vec::new(),
            proposed_actions: Vec::new(),
        })
    }

    fn copilot_qa(
        &self,
        app: &tauri::AppHandle,
        intent: &copilot::RoutedIntent,
        image_id: &str,
        llm: Option<&CopilotLlmConfig>,
    ) -> Result<CopilotTurnResult, AppError> {
        let model_id = match self.resolve_model_id()? {
            Some(id) => id,
            None => {
                return Ok(CopilotTurnResult::reply_only(
                    &intent.capability,
                    "QA review compares your annotations against the detector, but I don't have a \
                     model yet. Import or install one on the AI Models page first.",
                ))
            }
        };

        let detections = match self.generate_predictions(
            app,
            PredictionGeneratePayload {
                image_id: image_id.to_string(),
                model_id,
                threshold: None,
            },
        ) {
            Ok(predictions) => predictions,
            Err(error) => {
                return Ok(CopilotTurnResult::reply_only(
                    &intent.capability,
                    format!("I couldn't run the detector for QA: {error}"),
                ))
            }
        };

        let annotations = self
            .store
            .list_by_field("annotations", "image_id", image_id)?;
        let (findings, proposed_actions) = copilot::qa_findings(&detections, &annotations);

        let missed = findings.iter().filter(|f| f.kind == "missed").count();
        let mislabels = proposed_actions
            .iter()
            .filter(|a| matches!(a, copilot::ProposedAction::Relabel { .. }))
            .count();
        let duplicates = proposed_actions
            .iter()
            .filter(|a| matches!(a, copilot::ProposedAction::Delete { .. }))
            .count();

        let fallback = if findings.is_empty() {
            "Looks good \u{2014} the detector didn't surface any missed objects, mislabels, or \
             duplicate boxes on this image."
                .to_string()
        } else {
            format!(
                "QA review: {missed} possible missed object(s) (added as predictions to review), \
                 {mislabels} possible mislabel(s), and {duplicates} near-duplicate box(es). \
                 Approve the fixes you agree with below."
            )
        };
        // The detector + diff produced the findings; the copilot model phrases them.
        let instruction = format!(
            "A QA pass compared the local detector against the user's existing labels on this \
             image. Findings: {missed} possible missed objects (added as predictions), {mislabels} \
             possible mislabels, {duplicates} near-duplicate boxes. In one or two short sentences, \
             summarize this for the user and, if there are any fixes, tell them to approve the \
             suggested fixes shown below. If everything is zero, reassure them it looks good."
        );
        let reply = self.narrate(llm, &instruction, fallback);

        Ok(CopilotTurnResult {
            reply,
            capability: intent.capability.as_str().to_string(),
            predictions_added: detections.len(),
            findings,
            proposed_actions,
        })
    }

    /// Recommend label/class names for the current image, drawn from whatever is
    /// available — the auto-discovered local vision model and/or the on-device
    /// detector — merged, deduped, and filtered against the project's existing
    /// labels. Each suggestion is returned as a `CreateLabel` action the user can
    /// add with one click. Both sources stay on the user's machine.
    fn copilot_suggest_labels(
        &self,
        app: &tauri::AppHandle,
        intent: &copilot::RoutedIntent,
        image: &Value,
        image_id: &str,
        llm: Option<&CopilotLlmConfig>,
    ) -> Result<CopilotTurnResult, AppError> {
        let project_id = value_string(image, "projectId", "project_id").unwrap_or_default();
        let existing_labels = if project_id.is_empty() {
            Vec::new()
        } else {
            self.store.list_by_field("labels", "project_id", &project_id)?
        };
        let existing_lower: std::collections::HashSet<String> = existing_labels
            .iter()
            .filter_map(|label| value_string(label, "name", "name"))
            .map(|name| name.trim().to_lowercase())
            .collect();

        let mut suggestions: Vec<String> = Vec::new();
        let mut sources: Vec<&str> = Vec::new();
        let mut notes: Vec<String> = Vec::new();
        let mut predictions_added = 0usize;

        // 1) Vision model: ask it to name the object classes it sees.
        let vision_available = matches!(llm, Some(config) if config.vision);
        if let Some(config) = llm {
            if config.vision {
                match self.vlm_suggest_labels(image, config) {
                    Ok(mut names) if !names.is_empty() => {
                        sources.push("the vision model");
                        suggestions.append(&mut names);
                    }
                    Ok(_) => {}
                    Err(_) => {
                        // A failed call shouldn't sink the whole turn — the
                        // detector may still produce names. Re-discover only if
                        // the server is actually gone.
                        if !llm::server_reachable(&config.base_url) {
                            self.invalidate_llm();
                        }
                    }
                }
            }
        }

        // 2) Detector: run it (best-effort) and use the classes it found on THIS
        //    image. This also surfaces boxes on the canvas to accept.
        let detector_model_id = self.resolve_model_id().ok().flatten();
        let detector_available = detector_model_id.is_some();
        if let Some(model_id) = detector_model_id {
            match self.generate_predictions(
                app,
                PredictionGeneratePayload {
                    image_id: image_id.to_string(),
                    model_id,
                    threshold: None,
                },
            ) {
                Ok(predictions) => {
                    predictions_added = predictions.len();
                    let mut names: Vec<String> = predictions
                        .iter()
                        .filter_map(|prediction| {
                            value_string(prediction, "labelName", "label_name")
                                .or_else(|| value_string(prediction, "name", "name"))
                        })
                        .map(|name| name.trim().to_lowercase())
                        .filter(|name| !name.is_empty())
                        .collect();
                    if !names.is_empty() {
                        sources.push("the detector");
                    }
                    suggestions.append(&mut names);
                }
                Err(error) => notes.push(format!("The detector couldn\u{2019}t run ({error}).")),
            }
        }

        // Neither source is set up → tell the user how to enable one.
        if !vision_available && !detector_available {
            return Ok(CopilotTurnResult::reply_only(
                &intent.capability,
                "To suggest label names from this image I need either a local vision model \
                 (start LM Studio, Ollama, or llama.cpp with a \u{201c}-VL\u{201d}/LLaVA/Moondream \
                 model) or an installed detector (add a YOLO model on the AI Models page). Set up \
                 either one and ask again \u{2014} both stay on your machine.",
            ));
        }

        // Dedupe (case-insensitive, order-preserving) and drop names the project
        // already has a label for.
        let mut seen = std::collections::HashSet::new();
        let mut fresh: Vec<String> = Vec::new();
        let mut already_have = 0usize;
        for name in suggestions {
            let key = name.trim().to_lowercase();
            if key.is_empty() || !seen.insert(key.clone()) {
                continue;
            }
            if existing_lower.contains(&key) {
                already_have += 1;
                continue;
            }
            fresh.push(key);
        }
        fresh.truncate(copilot::MAX_LABEL_SUGGESTIONS);

        let proposed_actions: Vec<copilot::ProposedAction> = fresh
            .iter()
            .map(|name| copilot::ProposedAction::CreateLabel {
                name: name.clone(),
                color: DEFAULT_AI_LABEL_COLOR.to_string(),
                project_id: project_id.clone(),
                message: format!("Add \u{201c}{name}\u{201d} as a label"),
            })
            .collect();

        let reply = build_suggest_reply(&fresh, &sources, already_have, &notes);

        Ok(CopilotTurnResult {
            reply,
            capability: intent.capability.as_str().to_string(),
            predictions_added,
            findings: Vec::new(),
            proposed_actions,
        })
    }

    /// Ask the configured local vision model to name the object categories in the
    /// image, returning a cleaned list of candidate label names.
    fn vlm_suggest_labels(
        &self,
        image: &Value,
        config: &CopilotLlmConfig,
    ) -> Result<Vec<String>, AppError> {
        let image_url = value_string(image, "path", "path")
            .and_then(|path| llm::image_data_url(&path))
            .ok_or_else(|| {
                AppError::Message("Image file is unavailable for the vision model".into())
            })?;
        let api_key = crate::read_secret("copilot", "apiKey").ok().flatten();
        let raw = llm::chat_completion(
            config,
            api_key.as_deref(),
            LABEL_SUGGEST_SYSTEM_PROMPT,
            LABEL_SUGGEST_USER_PROMPT,
            Some(&image_url),
        )?;
        Ok(copilot::parse_label_list(&raw))
    }

    /// Apply a copilot action the user approved (relabel / delete / new label).
    pub fn copilot_apply_action(
        &self,
        app: &tauri::AppHandle,
        payload: CopilotActionPayload,
    ) -> Result<Value, AppError> {
        match payload {
            CopilotActionPayload::Delete { annotation_id } => {
                let existing = delete_entity(
                    self.store.as_ref(),
                    "annotations",
                    &annotation_id,
                    "Annotation not found",
                )?;
                emit_domain_event(app, "annotations", "deleted", &existing)?;
                Ok(json!({ "success": true }))
            }
            CopilotActionPayload::Relabel {
                annotation_id,
                to_label,
            } => {
                let mut annotation = get_entity_or_error(
                    self.store.as_ref(),
                    "annotations",
                    &annotation_id,
                    "Annotation not found",
                )?;
                let project_id =
                    value_string(&annotation, "projectId", "project_id").unwrap_or_default();
                let (label, created) = self.find_or_create_label(&project_id, &to_label)?;
                let label_id = value_string(&label, "id", "id");
                let color = value_string(&label, "color", "color")
                    .unwrap_or_else(|| DEFAULT_AI_LABEL_COLOR.to_string());
                {
                    let object = as_object_mut(&mut annotation)?;
                    object.insert("name".into(), Value::String(to_label.clone()));
                    if let Some(id) = &label_id {
                        object.insert("labelId".into(), Value::String(id.clone()));
                        object.insert("label_id".into(), Value::String(id.clone()));
                    }
                    object.insert("color".into(), Value::String(color));
                }
                let normalized = normalize_entity("annotations", annotation)?;
                let saved = self.store.upsert_entity("annotations", normalized)?;
                if created {
                    emit_domain_event(app, "labels", "created", &label)?;
                }
                emit_domain_event(app, "annotations", "updated", &saved)?;
                Ok(saved)
            }
            CopilotActionPayload::CreateLabel {
                name,
                color: _,
                project_id,
            } => {
                let (label, created) = self.find_or_create_label(&project_id, &name)?;
                if created {
                    emit_domain_event(app, "labels", "created", &label)?;
                }
                Ok(label)
            }
        }
    }

    /// Find a project label by name (case-insensitive) or create one.
    fn find_or_create_label(
        &self,
        project_id: &str,
        name: &str,
    ) -> Result<(Value, bool), AppError> {
        let labels = self.store.list_by_field("labels", "project_id", project_id)?;
        if let Some(existing) = labels.iter().find(|label| {
            value_string(label, "name", "name")
                .map(|existing_name| existing_name.eq_ignore_ascii_case(name))
                .unwrap_or(false)
        }) {
            return Ok((existing.clone(), false));
        }

        let label = normalize_entity(
            "labels",
            json!({
                "name": name,
                "projectId": project_id,
                "project_id": project_id,
                "color": DEFAULT_AI_LABEL_COLOR,
                "isAIGenerated": true,
            }),
        )?;
        let saved = self.store.upsert_entity("labels", label)?;
        Ok((saved, true))
    }
}

/// Compact "3 car, 1 person" style summary of prediction classes.
fn summarize_by_class(predictions: &[Value]) -> String {
    use std::collections::BTreeMap;

    let mut counts: BTreeMap<String, usize> = BTreeMap::new();
    for prediction in predictions {
        let name = value_string(prediction, "labelName", "label_name")
            .or_else(|| value_string(prediction, "name", "name"))
            .unwrap_or_else(|| "object".to_string());
        *counts.entry(name).or_insert(0) += 1;
    }

    counts
        .into_iter()
        .take(6)
        .map(|(name, count)| format!("{count} {name}"))
        .collect::<Vec<_>>()
        .join(", ")
}

/// Compose the copilot's reply for a label-suggestion turn from the fresh names,
/// which sources produced them, how many were already covered, and any notes.
fn build_suggest_reply(
    fresh: &[String],
    sources: &[&str],
    already_have: usize,
    notes: &[String],
) -> String {
    let mut parts: Vec<String> = Vec::new();
    if fresh.is_empty() {
        if already_have > 0 {
            parts.push(format!(
                "Your project already has labels for everything I recognized here ({already_have} \
                 match{}).",
                if already_have == 1 { "" } else { "es" }
            ));
        } else {
            parts.push(
                "I couldn\u{2019}t pick out clear object categories to label in this image.".into(),
            );
        }
    } else {
        let source_text = if sources.is_empty() {
            String::new()
        } else {
            format!(" (from {})", join_human(sources))
        };
        parts.push(format!(
            "Here are label names I\u{2019}d suggest for this image{source_text} \u{2014} tap one to \
             add it to your project:"
        ));
        if already_have > 0 {
            parts.push(format!(
                "({already_have} more match labels you already have.)"
            ));
        }
    }
    parts.extend(notes.iter().cloned());
    parts.join(" ")
}

/// Join a short list into "a", "a and b", or "a, b and c".
fn join_human(items: &[&str]) -> String {
    match items {
        [] => String::new(),
        [one] => (*one).to_string(),
        [first, second] => format!("{first} and {second}"),
        _ => {
            let (last, rest) = items.split_last().expect("non-empty");
            format!("{} and {}", rest.join(", "), last)
        }
    }
}

fn get_entity_or_error(
    store: &dyn EntityStore,
    kind: &str,
    id: &str,
    message: &str,
) -> Result<Value, AppError> {
    store
        .get_entity(kind, id)?
        .ok_or_else(|| AppError::Message(message.to_string()))
}

fn save_entity(
    store: &dyn EntityStore,
    kind: &str,
    payload: Value,
) -> Result<(Value, &'static str), AppError> {
    if let Some(id) = value_string(&payload, "id", "id") {
        if let Some(mut existing) = store.get_entity(kind, &id)? {
            merge_patch(&mut existing, &payload);
            let normalized = normalize_entity(kind, existing)?;
            store.upsert_entity(kind, normalized.clone())?;
            return Ok((normalized, "updated"));
        }
    }

    let normalized = normalize_entity(kind, payload)?;
    store.upsert_entity(kind, normalized.clone())?;
    Ok((normalized, "created"))
}

fn delete_entity(
    store: &dyn EntityStore,
    kind: &str,
    id: &str,
    message: &str,
) -> Result<Value, AppError> {
    let existing = get_entity_or_error(store, kind, id, message)?;
    store.delete_entity(kind, id)?;
    Ok(existing)
}

struct ModelMetadataBuildResult {
    labels_path: String,
    metadata: Value,
}

struct ResolvedPredictionLabel {
    label_id: Option<String>,
    label_name: Option<String>,
    label_color: Option<String>,
}

fn normalize_class_names(names: Vec<String>) -> Option<Vec<String>> {
    let normalized = names
        .into_iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();

    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

fn extract_named_value_list(entries: &[Value]) -> Option<Vec<String>> {
    let values = entries
        .iter()
        .map(|value| {
            value.as_str().map(ToString::to_string).or_else(|| {
                value
                    .get("name")
                    .and_then(Value::as_str)
                    .map(ToString::to_string)
            })
        })
        .collect::<Option<Vec<String>>>()?;

    normalize_class_names(values)
}

fn extract_named_value_map(entries: &Map<String, Value>) -> Option<Vec<String>> {
    let mut numbered_entries = entries
        .iter()
        .filter_map(|(key, value)| Some((key.parse::<usize>().ok()?, value.as_str()?)))
        .collect::<Vec<_>>();
    numbered_entries.sort_by_key(|(index, _)| *index);

    if numbered_entries.is_empty() {
        return None;
    }

    normalize_class_names(
        numbered_entries
            .into_iter()
            .map(|(_, value)| value.to_string())
            .collect(),
    )
}

fn extract_class_names_from_value(value: &Value) -> Option<Vec<String>> {
    match value {
        Value::Array(entries) => extract_named_value_list(entries),
        Value::Object(entries) => {
            for key in ["classNames", "class_names", "names", "labels", "classes"] {
                if let Some(candidate) = entries.get(key).and_then(extract_class_names_from_value) {
                    return Some(candidate);
                }
            }
            extract_named_value_map(entries)
        }
        _ => None,
    }
}

fn parse_config_class_names(config_path: &str) -> Result<Option<Vec<String>>, AppError> {
    if config_path.trim().is_empty() {
        return Ok(None);
    }

    let path = Path::new(config_path);
    if !path.exists() {
        return Ok(None);
    }

    let contents = fs::read_to_string(path)?;
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    let parsed = match extension.as_str() {
        "json" => serde_json::from_str::<Value>(&contents)?,
        "yaml" | "yml" => {
            serde_json::to_value(serde_yaml::from_str::<serde_yaml::Value>(&contents)?)?
        }
        _ => return Ok(None),
    };

    Ok(extract_class_names_from_value(&parsed))
}

fn builtin_class_names(family: &str, category: &str) -> Option<Vec<String>> {
    if category.eq_ignore_ascii_case("detection")
        && matches!(
            family.trim().to_ascii_lowercase().as_str(),
            "yolo26" | "yolo11" | "yolov8"
        )
    {
        return Some(
            COCO_80_CLASS_NAMES
                .iter()
                .map(|value| value.to_string())
                .collect(),
        );
    }

    None
}

fn model_extension(model_path: &Path) -> String {
    model_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
}

fn is_pytorch_checkpoint(model_path: &Path) -> bool {
    matches!(model_extension(model_path).as_str(), "pt" | "pth")
}

fn trim_command_detail(detail: &str) -> String {
    let trimmed = detail.trim();
    if trimmed.len() <= 240 {
        trimmed.to_string()
    } else {
        format!("{}...", &trimmed[..237])
    }
}

fn summarize_command_output(output: &std::process::Output) -> String {
    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    stderr
        .lines()
        .rev()
        .find(|line| !line.trim().is_empty())
        .or_else(|| stdout.lines().rev().find(|line| !line.trim().is_empty()))
        .map(trim_command_detail)
        .unwrap_or_else(|| "The export command did not return additional details.".into())
}

fn extract_exported_onnx_path(output: &str) -> Option<PathBuf> {
    output.lines().rev().find_map(|line| {
        line.split_whitespace().rev().find_map(|token| {
            let candidate = token.trim_matches(|character| {
                matches!(character, '"' | '\'' | ',' | ';' | '(' | ')' | '[' | ']')
            });
            if candidate.to_ascii_lowercase().ends_with(".onnx") {
                Some(PathBuf::from(candidate))
            } else {
                None
            }
        })
    })
}

fn export_pytorch_checkpoint_to_onnx(model_path: &Path) -> Result<PathBuf, AppError> {
    let expected_output_path = model_path.with_extension("onnx");
    if expected_output_path.exists() {
        return Ok(expected_output_path);
    }

    let script = concat!(
        "import sys\n",
        "from ultralytics import YOLO\n",
        "exported = YOLO(sys.argv[1]).export(format='onnx')\n",
        "if isinstance(exported, (list, tuple)):\n",
        "    exported = exported[0] if exported else ''\n",
        "print(exported or '')\n"
    );
    let model_path_arg = model_path.to_string_lossy().to_string();
    let attempts = vec![
        (
            "python",
            vec!["-c".to_string(), script.to_string(), model_path_arg.clone()],
        ),
        (
            "py",
            vec![
                "-3".to_string(),
                "-c".to_string(),
                script.to_string(),
                model_path_arg,
            ],
        ),
    ];
    let mut failures = Vec::new();

    for (program, args) in attempts {
        match Command::new(program).args(&args).output() {
            Ok(output) if output.status.success() => {
                if expected_output_path.exists() {
                    return Ok(expected_output_path);
                }

                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                if let Some(exported_path) = extract_exported_onnx_path(&stdout)
                    .or_else(|| extract_exported_onnx_path(&stderr))
                {
                    if exported_path.exists() {
                        if exported_path != expected_output_path {
                            fs::copy(&exported_path, &expected_output_path)?;
                        }
                        return Ok(expected_output_path);
                    }
                }

                failures.push(format!(
                    "{program}: export finished but no ONNX file was found"
                ));
            }
            Ok(output) => {
                failures.push(format!("{program}: {}", summarize_command_output(&output)))
            }
            Err(error) => failures.push(format!(
                "{program}: {}",
                trim_command_detail(&error.to_string())
            )),
        }
    }

    Err(AppError::Message(format!(
        "Failed to convert the PyTorch checkpoint to ONNX for local AI detect. Install Python with the ultralytics package, or import an ONNX export directly. {}",
        failures.join(" ")
    )))
}

struct PreparedModelAsset {
    runtime_model_path: PathBuf,
    metadata_seed: Option<Value>,
}

fn prepare_model_asset_for_inference(model_path: &Path) -> PreparedModelAsset {
    if !is_pytorch_checkpoint(model_path) {
        return PreparedModelAsset {
            runtime_model_path: model_path.to_path_buf(),
            metadata_seed: None,
        };
    }

    let source_path = model_path.to_string_lossy().to_string();
    match export_pytorch_checkpoint_to_onnx(model_path) {
        Ok(runtime_model_path) => PreparedModelAsset {
            runtime_model_path: runtime_model_path.clone(),
            metadata_seed: Some(json!({
                "sourceCheckpointPath": source_path,
                "conversionStatus": "converted_to_onnx",
                "conversionModelPath": runtime_model_path.to_string_lossy().to_string(),
                "conversionMessage": "Converted the PyTorch checkpoint to ONNX for local Rust inference."
            })),
        },
        Err(error) => PreparedModelAsset {
            runtime_model_path: model_path.to_path_buf(),
            metadata_seed: Some(json!({
                "sourceCheckpointPath": source_path,
                "conversionStatus": "conversion_failed",
                "conversionMessage": error.to_string()
            })),
        },
    }
}

/// Ultralytics-style filename suffix → task, authoritative over the installed
/// category (a `-cls`/`-seg`/`-pose` asset is that task even if it was downloaded
/// under a "detection" catalog entry). Returns `None` for plain detectors.
fn task_suffix(model_path: &Path) -> Option<&'static str> {
    let name = model_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_lowercase();
    if name.contains("-cls") || name.contains("_cls") {
        Some("classification")
    } else if name.contains("-pose") || name.contains("_pose") {
        Some("pose")
    } else if name.contains("-seg") || name.contains("_seg") {
        Some("segmentation")
    } else {
        None
    }
}

/// Accurate, role-aware reason a model can't run the box detector — segmentation
/// models are usable (via the copilot), classification/pose are different tasks.
fn non_detection_reason(task: &str) -> String {
    match task {
        "segmentation" => "Segmentation model \u{2014} used by the AI Copilot for click/box \u{2192} polygon (ask it to \u{201c}outline them\u{201d}), not the Detect button.",
        "classification" => "Classification model \u{2014} it labels the whole image, not regions. Install a detection model (e.g. YOLO26 Detection) to draw boxes.",
        "pose" => "Pose-estimation model \u{2014} not a box detector. Install a detection model for AI detect.",
        _ => "AI detect supports object-detection models; this model uses a different task.",
    }
    .to_string()
}

fn prediction_unsupported_reason(
    model_path: &Path,
    category: &str,
    has_class_names: bool,
    conversion_message: Option<&str>,
) -> Option<String> {
    // Filename suffix is authoritative about the task (catches a `-cls` asset
    // installed under the "detection" category).
    if let Some(task) = task_suffix(model_path) {
        return Some(non_detection_reason(task));
    }
    if !category.eq_ignore_ascii_case("detection") {
        return Some(non_detection_reason(&category.to_lowercase()));
    }

    let extension = model_extension(model_path);
    if extension != "onnx" {
        if is_pytorch_checkpoint(model_path) {
            if let Some(message) = conversion_message.filter(|value| !value.trim().is_empty()) {
                return Some(message.to_string());
            }
        }

        let details = if extension.is_empty() {
            "without a recognized file extension".to_string()
        } else {
            format!("with a .{extension} checkpoint")
        };
        return Some(format!(
            "AI detect currently requires an ONNX model file. This model was imported {details}."
        ));
    }

    if !cfg!(feature = "yolo-inference") {
        return Some("This desktop build does not include local ONNX inference support.".into());
    }

    if !has_class_names {
        return Some(
            "No class metadata was found for this model. Import a YAML or JSON config file with class names, or use a model family with built-in labels."
                .into(),
        );
    }

    None
}

fn build_model_metadata(
    model_path: &Path,
    config_path: &str,
    category: &str,
    family: &str,
    seed_metadata: Option<&Value>,
) -> Result<ModelMetadataBuildResult, AppError> {
    let mut metadata = seed_metadata
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let mut class_names = seed_metadata
        .and_then(extract_class_names_from_value)
        .unwrap_or_default();
    let mut label_source = metadata
        .get("labelSource")
        .and_then(Value::as_str)
        .unwrap_or("none")
        .to_string();
    let conversion_message = metadata
        .get("conversionMessage")
        .and_then(Value::as_str)
        .map(ToString::to_string);

    if class_names.is_empty() {
        if let Some(parsed) = parse_config_class_names(config_path)? {
            label_source = "config_file".into();
            class_names = parsed;
        } else if let Some(builtin) = builtin_class_names(family, category) {
            label_source = "builtin_catalog".into();
            class_names = builtin;
        }
    }

    let unsupported_reason = prediction_unsupported_reason(
        model_path,
        category,
        !class_names.is_empty(),
        conversion_message.as_deref(),
    );
    let supports_prediction = unsupported_reason.is_none();
    let labels_path = if config_path.trim().is_empty() {
        String::new()
    } else {
        config_path.to_string()
    };

    metadata.insert(
        "classNames".into(),
        Value::Array(class_names.iter().cloned().map(Value::String).collect()),
    );
    metadata.insert("classCount".into(), json!(class_names.len()));
    metadata.insert("labelSource".into(), Value::String(label_source));
    metadata.insert(
        "supportsPrediction".into(),
        Value::Bool(supports_prediction),
    );
    metadata.insert(
        "unsupportedReason".into(),
        unsupported_reason.map(Value::String).unwrap_or(Value::Null),
    );

    Ok(ModelMetadataBuildResult {
        labels_path,
        metadata: Value::Object(metadata),
    })
}

fn upgrade_model_for_local_inference(
    store: &dyn EntityStore,
    model: Value,
) -> Result<Value, AppError> {
    let current_model_path = value_string(&model, "modelPath", "model_path").unwrap_or_default();
    if current_model_path.is_empty() {
        return Ok(model);
    }

    let prepared_asset = prepare_model_asset_for_inference(Path::new(&current_model_path));
    if prepared_asset.runtime_model_path == Path::new(&current_model_path)
        && prepared_asset.metadata_seed.is_none()
    {
        return Ok(model);
    }

    let config_path = value_string(&model, "configPath", "config_path").unwrap_or_default();
    let category =
        value_string(&model, "category", "category").unwrap_or_else(|| "detection".into());
    let name = value_string(&model, "name", "name").unwrap_or_default();
    let family = value_string(&model, "family", "family")
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| {
            infer_model_family_and_variant(&name, &prepared_asset.runtime_model_path).0
        });
    let mut seed_metadata = model
        .get("modelMetadata")
        .cloned()
        .unwrap_or_else(|| json!({}));
    if let Some(prepared_metadata) = prepared_asset.metadata_seed.as_ref() {
        merge_patch(&mut seed_metadata, prepared_metadata);
    }

    let metadata = build_model_metadata(
        &prepared_asset.runtime_model_path,
        &config_path,
        &category,
        &family,
        Some(&seed_metadata),
    )?;
    let (framework, backend) = infer_model_runtime(&prepared_asset.runtime_model_path);
    let model_size = fs::metadata(&prepared_asset.runtime_model_path)
        .map(|metadata| metadata.len())
        .unwrap_or_default();
    let runtime_model_path = prepared_asset
        .runtime_model_path
        .to_string_lossy()
        .to_string();

    let mut upgraded = model.clone();
    let object = as_object_mut(&mut upgraded)?;
    object.insert(
        "modelPath".into(),
        Value::String(runtime_model_path.clone()),
    );
    object.insert("model_path".into(), Value::String(runtime_model_path));
    object.insert("framework".into(), Value::String(framework.to_string()));
    object.insert("backend".into(), Value::String(backend.to_string()));
    object.insert("modelSize".into(), json!(model_size));
    object.insert("labelsPath".into(), Value::String(metadata.labels_path));
    object.insert("modelMetadata".into(), metadata.metadata);

    let normalized = normalize_entity("ai_models", upgraded)?;
    if normalized != model {
        store.upsert_entity("ai_models", normalized.clone())?;
    }

    Ok(normalized)
}

fn hydrate_ai_model_entity(store: &dyn EntityStore, model: Value) -> Result<Value, AppError> {
    let model_path = value_string(&model, "modelPath", "model_path").unwrap_or_default();
    let config_path = value_string(&model, "configPath", "config_path").unwrap_or_default();
    let category =
        value_string(&model, "category", "category").unwrap_or_else(|| "detection".into());
    let name = value_string(&model, "name", "name").unwrap_or_default();
    let family = value_string(&model, "family", "family")
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| infer_model_family_and_variant(&name, Path::new(&model_path)).0);
    let metadata = build_model_metadata(
        Path::new(&model_path),
        &config_path,
        &category,
        &family,
        model.get("modelMetadata"),
    )?;

    let mut hydrated = model.clone();
    let object = as_object_mut(&mut hydrated)?;
    object.insert("labelsPath".into(), Value::String(metadata.labels_path));
    object.insert("modelMetadata".into(), metadata.metadata);
    let normalized = normalize_entity("ai_models", hydrated)?;

    if normalized != model {
        store.upsert_entity("ai_models", normalized.clone())?;
    }

    Ok(normalized)
}

fn hydrate_ai_models(store: &dyn EntityStore, models: Vec<Value>) -> Result<Vec<Value>, AppError> {
    models
        .into_iter()
        .map(|model| hydrate_ai_model_entity(store, model))
        .collect()
}

fn find_project_label_by_id<'a>(labels: &'a [Value], label_id: &str) -> Option<&'a Value> {
    labels.iter().find(|label| {
        value_string(label, "id", "id")
            .map(|candidate| candidate == label_id)
            .unwrap_or(false)
    })
}

fn find_project_label_by_name<'a>(labels: &'a [Value], label_name: &str) -> Option<&'a Value> {
    labels
        .iter()
        .find(|label| {
            value_string(label, "name", "name")
                .map(|candidate| candidate == label_name)
                .unwrap_or(false)
        })
        .or_else(|| {
            labels.iter().find(|label| {
                value_string(label, "name", "name")
                    .map(|candidate| candidate.eq_ignore_ascii_case(label_name))
                    .unwrap_or(false)
            })
        })
}

fn resolve_prediction_label(
    labels: &[Value],
    draft: &InferenceAnnotationDraft,
) -> ResolvedPredictionLabel {
    if let Some(label_id) = draft.label_id.as_deref() {
        if let Some(label) = find_project_label_by_id(labels, label_id) {
            return ResolvedPredictionLabel {
                label_id: value_string(label, "id", "id"),
                label_name: value_string(label, "name", "name"),
                label_color: value_string(label, "color", "color")
                    .or_else(|| draft.label_color.clone()),
            };
        }
    }

    if let Some(label_name) = draft.label_name.as_deref().or(Some(draft.name.as_str())) {
        if let Some(label) = find_project_label_by_name(labels, label_name) {
            return ResolvedPredictionLabel {
                label_id: value_string(label, "id", "id"),
                label_name: value_string(label, "name", "name"),
                label_color: value_string(label, "color", "color")
                    .or_else(|| draft.label_color.clone()),
            };
        }
    }

    ResolvedPredictionLabel {
        label_id: draft.label_id.clone(),
        label_name: draft
            .label_name
            .clone()
            .or_else(|| Some(draft.name.clone())),
        label_color: draft
            .label_color
            .clone()
            .or_else(|| Some(DEFAULT_AI_LABEL_COLOR.into())),
    }
}

fn prediction_ids_for_replacement(predictions: &[Value], model_id: &str) -> Vec<String> {
    predictions
        .iter()
        .filter(|prediction| {
            value_string(prediction, "modelId", "model_id")
                .map(|candidate| candidate == model_id)
                .unwrap_or(false)
        })
        .filter_map(|prediction| value_string(prediction, "id", "id"))
        .collect()
}

/// Whether a detection draft's class matches a requested target phrase,
/// case-insensitively and tolerant of simple singular/plural ("car" ~ "cars").
fn draft_matches_class(draft: &InferenceAnnotationDraft, target: &str) -> bool {
    let target = target.trim().to_lowercase();
    if target.is_empty() {
        return true;
    }
    [
        draft.name.to_lowercase(),
        draft.label_name.clone().unwrap_or_default().to_lowercase(),
    ]
    .iter()
    .any(|value| class_token_matches(value.trim(), &target))
}

/// Whether a "detect target" is a generic catch-all rather than a real class
/// (e.g. "objects", "everything", "all objects"). Such targets must not be used as
/// a class filter — no detector class matches them, so they'd zero out every
/// detection. Treated as generic when every word is a filler/catch-all token.
fn is_generic_detect_target(target: &str) -> bool {
    const GENERIC: &[&str] = &[
        "object", "objects", "thing", "things", "item", "items", "stuff", "everything", "anything",
        "something", "all", "any", "every", "the", "a", "an",
    ];
    let trimmed = target.trim().to_lowercase();
    if trimmed.is_empty() {
        return true;
    }
    trimmed.split_whitespace().all(|word| GENERIC.contains(&word))
}

/// Singular/plural-tolerant equality for two already-lowercased class tokens.
fn class_token_matches(a: &str, b: &str) -> bool {
    if a.is_empty() || b.is_empty() {
        return false;
    }
    a == b || format!("{a}s") == b || format!("{b}s") == a
}

/// Best-effort mapping from an installed `ai_models` entity to a registry plugin
/// id (see [`crate::domain::ai::registry`]), used when the caller didn't pass an
/// explicit `registryId`. The frontend normally passes the id of the catalog
/// entry it invoked; this fallback lets the backend (e.g. copilot detect→segment
/// chaining) resolve a plugin from the active model alone. Unknown values resolve
/// to a `NotImplementedPlugin` that reports a clear error.
fn registry_id_for_model(model: &Value) -> String {
    let family = value_string(model, "family", "family")
        .unwrap_or_default()
        .to_lowercase();
    let category = value_string(model, "category", "category")
        .unwrap_or_default()
        .to_lowercase();
    let task = value_string(model, "taskType", "task_type")
        .unwrap_or_default()
        .to_lowercase();
    let name = value_string(model, "name", "name")
        .unwrap_or_default()
        .to_lowercase();
    let path = value_string(model, "modelPath", "model_path")
        .unwrap_or_default()
        .to_lowercase();
    let mentions = |needle: &str| {
        family.contains(needle)
            || category.contains(needle)
            || task.contains(needle)
            || name.contains(needle)
            || path.contains(needle)
    };

    // Recognize SAM by family/name/filename, including the "Segment Anything"
    // wording (its files/names don't always contain "sam").
    let is_sam = mentions("sam")
        || name.contains("segment anything")
        || path.contains("segment_anything");

    if family.contains("sam2") || name.contains("sam2") || name.contains("sam 2") {
        "sam2".to_string()
    } else if is_sam {
        "mobile-sam".to_string()
    } else if mentions("yolo-world") || family.contains("yoloworld") || family.contains("yoloe") {
        "yolo-world".to_string()
    } else if mentions("yolo") || mentions("detection") {
        "yolo-detection".to_string()
    } else if !family.is_empty() {
        family
    } else {
        "unknown".to_string()
    }
}

fn infer_model_family_and_variant(name: &str, model_path: &Path) -> (String, String) {
    let haystack = format!(
        "{} {}",
        name.to_ascii_lowercase(),
        model_path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase()
    );

    let family = if haystack.contains("yoloe-26") {
        "yoloe-26"
    } else if haystack.contains("yolo26") {
        "yolo26"
    } else if haystack.contains("yolo11") {
        "yolo11"
    } else if haystack.contains("yolov8") {
        "yolov8"
    } else {
        ""
    };

    let variant = ["n", "s", "m", "l", "x"]
        .iter()
        .copied()
        .find(|variant| {
            haystack.contains(&format!("yolo26{variant}"))
                || haystack.contains(&format!("yoloe-26{variant}"))
        })
        .unwrap_or_default();

    (family.to_string(), variant.to_string())
}

fn infer_default_rank(family: &str, category: &str, variant: &str) -> i64 {
    if family == "yolo26" && category == "detection" {
        match variant {
            "n" => 0,
            "s" => 10,
            "m" => 20,
            "l" => 30,
            "x" => 40,
            _ => 100,
        }
    } else if family == "yolo26" {
        50
    } else if family == "yoloe-26" {
        100
    } else {
        999
    }
}

fn infer_model_runtime(model_path: &Path) -> (&'static str, &'static str) {
    match model_extension(model_path).as_str() {
        "onnx" => ("onnx", "ort"),
        "pt" | "pth" => ("pytorch", "cpu"),
        "tflite" => ("tflite", "cpu"),
        "h5" => ("keras", "cpu"),
        "pb" => ("tensorflow", "cpu"),
        _ => ("unknown", "cpu"),
    }
}

fn task_type_for_category(category: &str) -> &'static str {
    match category {
        "segmentation" => "segmentation",
        "classification" => "classification",
        "pose" => "pose_estimation",
        "tracking" => "tracking",
        _ => "object_detection",
    }
}

fn build_model_version(
    name: &str,
    version: &str,
    family: &str,
    variant: &str,
    category: &str,
) -> String {
    if !family.is_empty() && !variant.is_empty() {
        let base = if family == "yoloe-26" {
            format!("YOLOE-26{variant}")
        } else {
            format!("YOLO26{variant}")
        };

        return match category {
            "segmentation" => format!("{base}-seg"),
            "pose" => format!("{base}-pose"),
            _ => base,
        };
    }
    format!("{name} {version}")
}

fn file_name_from_path(path: &Path, invalid_message: &str) -> Result<String, AppError> {
    path.file_name()
        .and_then(|value| value.to_str())
        .map(ToString::to_string)
        .ok_or_else(|| AppError::Message(invalid_message.into()))
}

fn file_name_from_url(url: &str) -> Option<String> {
    reqwest::Url::parse(url)
        .ok()?
        .path_segments()?
        .next_back()
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

/// Resolve the on-disk filename for a model component: the explicit `file_name`
/// when given, otherwise derived from the URL. Only the final path component is
/// kept, so a malicious `../` name can't write outside the model directory.
fn resolve_component_file_name(file_name: Option<&str>, url: &str) -> Option<String> {
    let raw = file_name
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .or_else(|| file_name_from_url(url))?;
    Path::new(&raw)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn find_existing_model_installation(
    store: &dyn EntityStore,
    category: &str,
    family: &str,
    variant: &str,
    version: &str,
) -> Result<Option<Value>, AppError> {
    if family.is_empty() || variant.is_empty() {
        return Ok(None);
    }

    let normalized_category = category.trim().to_ascii_lowercase();
    let normalized_family = family.trim().to_ascii_lowercase();
    let normalized_variant = variant.trim().to_ascii_lowercase();
    let normalized_version = version.trim().to_ascii_lowercase();

    for model in store.list_entities("ai_models")? {
        let installed_category = value_string(&model, "category", "category")
            .unwrap_or_default()
            .trim()
            .to_ascii_lowercase();
        let installed_family = value_string(&model, "family", "family")
            .unwrap_or_default()
            .trim()
            .to_ascii_lowercase();
        let installed_variant = value_string(&model, "variant", "variant")
            .unwrap_or_default()
            .trim()
            .to_ascii_lowercase();
        let installed_version = value_string(&model, "version", "version")
            .unwrap_or_default()
            .trim()
            .to_ascii_lowercase();
        let model_path = value_string(&model, "modelPath", "model_path").unwrap_or_default();

        if installed_category == normalized_category
            && installed_family == normalized_family
            && installed_variant == normalized_variant
            && installed_version == normalized_version
            && !model_path.is_empty()
            && Path::new(&model_path).exists()
        {
            return Ok(Some(model));
        }
    }

    Ok(None)
}

struct AiModelEntityInput<'a> {
    model_id: &'a str,
    name: &'a str,
    description: &'a str,
    version: &'a str,
    category: &'a str,
    model_type: &'a str,
    task_type: Option<&'a str>,
    model_path: &'a Path,
    config_path: &'a str,
    project_id: Option<&'a String>,
    source: &'a str,
    download_url: Option<&'a str>,
    seed_metadata: Option<&'a Value>,
}

fn build_ai_model_entity(input: AiModelEntityInput<'_>) -> Result<Value, AppError> {
    let prepared_asset = prepare_model_asset_for_inference(input.model_path);
    let effective_model_path = &prepared_asset.runtime_model_path;
    let mut seed_metadata = input.seed_metadata.cloned().unwrap_or_else(|| json!({}));
    if let Some(prepared_metadata) = prepared_asset.metadata_seed.as_ref() {
        merge_patch(&mut seed_metadata, prepared_metadata);
    }

    let model_size = fs::metadata(effective_model_path)?.len();
    let (family, variant) = infer_model_family_and_variant(input.name, effective_model_path);
    let task_type = input
        .task_type
        .unwrap_or_else(|| task_type_for_category(input.category));
    let model_version =
        build_model_version(input.name, input.version, &family, &variant, input.category);
    let default_rank = infer_default_rank(&family, input.category, &variant);
    let supports_label_studio_format = input.category == "detection"
        || input.category == "segmentation"
        || input.category == "pose";
    let (framework, backend) = infer_model_runtime(effective_model_path);
    let metadata = build_model_metadata(
        effective_model_path,
        input.config_path,
        input.category,
        &family,
        Some(&seed_metadata),
    )?;
    let project_id = input.project_id.cloned();

    let mut model = json!({
      "id": input.model_id,
      "name": input.name,
      "description": input.description,
      "version": input.version,
      "modelPath": effective_model_path.to_string_lossy().to_string(),
      "configPath": input.config_path,
      "modelSize": model_size,
      "isCustom": true,
      "isActive": false,
      "status": "ready",
      "category": input.category,
      "type": input.model_type,
      "family": family,
      "variant": variant,
      "framework": framework,
      "backend": backend,
      "labelsPath": metadata.labels_path,
      "stride": 0,
      "defaultRank": default_rank,
      "supportsLabelStudioFormat": supports_label_studio_format,
      "taskType": task_type,
      "modelVersion": model_version,
      "modelMetadata": metadata.metadata,
      "projectId": project_id.clone(),
      "project_id": project_id,
      "source": input.source,
    });

    if let Some(download_url) = input.download_url {
        if let Some(object) = model.as_object_mut() {
            object.insert(
                "downloadUrl".into(),
                Value::String(download_url.to_string()),
            );
        }
    }

    normalize_entity("ai_models", model)
}

fn download_model_asset(download_url: &str, target_model_path: &Path) -> Result<(), AppError> {
    let client = Client::builder()
        .user_agent(format!("{APP_NAME}/{}", env!("CARGO_PKG_VERSION")))
        .build()?;
    let temp_download_path = target_model_path.with_extension("download");

    let download_result = (|| -> Result<(), AppError> {
        let mut response = client.get(download_url).send()?.error_for_status()?;
        let mut temp_file = fs::File::create(&temp_download_path)?;
        copy(&mut response, &mut temp_file)?;
        Ok(())
    })();

    if download_result.is_err() {
        let _ = fs::remove_file(&temp_download_path);
    } else {
        fs::rename(&temp_download_path, target_model_path)?;
    }

    download_result
}

fn ensure_prediction_label(
    store: &dyn EntityStore,
    prediction: &Value,
) -> Result<(Option<Value>, Option<Value>), AppError> {
    let label_id = value_string(prediction, "labelId", "label_id");
    if let Some(label_id) = label_id {
        if let Some(label) = store.get_entity("labels", &label_id)? {
            return Ok((Some(label), None));
        }
    }

    let project_id = value_string(prediction, "projectId", "project_id");
    let desired_name = value_string(prediction, "labelName", "label_name")
        .or_else(|| value_string(prediction, "name", "name"));

    if let (Some(project_id), Some(label_name)) = (project_id, desired_name) {
        let labels = store.list_by_field("labels", "project_id", &project_id)?;
        if let Some(label) = find_project_label_by_name(&labels, &label_name) {
            return Ok((Some(label.clone()), None));
        }

        let created_label = normalize_entity(
            "labels",
            json!({
              "name": label_name,
              "color": value_string(prediction, "labelColor", "label_color")
                .unwrap_or_else(|| DEFAULT_AI_LABEL_COLOR.into()),
              "projectId": project_id,
              "project_id": project_id,
              "isAIGenerated": true,
            }),
        )?;
        let created_label = store.upsert_entity("labels", created_label)?;
        return Ok((Some(created_label.clone()), Some(created_label)));
    }

    Ok((None, None))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_temp_path(extension: &str) -> PathBuf {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be available")
            .as_nanos();
        std::env::temp_dir().join(format!("vailabel-studio-test-{timestamp}.{extension}"))
    }

    #[test]
    fn parses_class_names_from_yaml_config() {
        let config_path = unique_temp_path("yaml");
        fs::write(
            &config_path,
            "names:\n  0: person\n  1: bicycle\n  2: car\n",
        )
        .expect("should write config");

        let class_names = parse_config_class_names(&config_path.to_string_lossy())
            .expect("config should parse")
            .expect("class names should be found");

        assert_eq!(class_names, vec!["person", "bicycle", "car"]);
        let _ = fs::remove_file(config_path);
    }

    #[test]
    fn cache_insert_bounded_evicts_at_capacity() {
        use crate::domain::ai::plugin::NotImplementedPlugin;
        let stub = || {
            CachedEngine::Plugin(Box::new(NotImplementedPlugin {
                model_name: "stub".into(),
                task: "test",
            }))
        };
        let mut cache: HashMap<String, CachedEngine> = HashMap::new();
        cache_insert_bounded(&mut cache, "a".into(), stub());
        cache_insert_bounded(&mut cache, "b".into(), stub());
        assert_eq!(cache.len(), MAX_CACHED_ENGINES);
        // A third distinct model evicts one to stay at the cap...
        cache_insert_bounded(&mut cache, "c".into(), stub());
        assert_eq!(cache.len(), MAX_CACHED_ENGINES);
        assert!(cache.contains_key("c"));
        // ...but re-inserting an existing key never grows past the cap.
        cache_insert_bounded(&mut cache, "c".into(), stub());
        assert_eq!(cache.len(), MAX_CACHED_ENGINES);
    }

    #[test]
    fn task_suffix_flags_cls_seg_pose_but_not_sam_or_plain_detector() {
        assert_eq!(task_suffix(Path::new("yolo11l-cls.onnx")), Some("classification"));
        assert_eq!(task_suffix(Path::new("yolo26n-seg.onnx")), Some("segmentation"));
        assert_eq!(task_suffix(Path::new("yolo26n-pose.pt")), Some("pose"));
        // Plain detector and SAM ("segment_anything…") must NOT be flagged.
        assert_eq!(task_suffix(Path::new("yolo26n.onnx")), None);
        assert_eq!(
            task_suffix(Path::new("segment_anything_vit_b_encoder_quant.onnx")),
            None
        );
    }

    #[test]
    fn generic_detect_targets_are_not_class_filters() {
        // These must NOT filter (they'd zero out every detection) — "detect objects".
        for generic in ["object", "objects", "everything", "anything", "all", "all objects", "any object", "  "] {
            assert!(is_generic_detect_target(generic), "should be generic: {generic:?}");
        }
        // Real classes still filter.
        for specific in ["car", "person", "traffic light", "dog"] {
            assert!(!is_generic_detect_target(specific), "should be specific: {specific:?}");
        }
    }

    #[test]
    fn class_filter_matches_case_and_plural() {
        let draft = |name: &str| InferenceAnnotationDraft {
            name: name.into(),
            annotation_type: "box".into(),
            coordinates: vec![],
            confidence: 0.9,
            label_id: None,
            label_name: Some(name.into()),
            label_color: None,
            is_ai_generated: true,
        };

        assert!(draft_matches_class(&draft("car"), "Cars")); // plural + case
        assert!(draft_matches_class(&draft("Car"), "car"));
        assert!(draft_matches_class(&draft("person"), "people") == false); // irregular: no false match
        assert!(!draft_matches_class(&draft("dog"), "car"));
        assert!(draft_matches_class(&draft("dog"), "")); // empty target keeps everything
    }

    #[test]
    fn resolves_component_file_name_from_explicit_url_and_traversal() {
        // Explicit name wins.
        assert_eq!(
            resolve_component_file_name(Some("mask_decoder.onnx"), "https://x/y/enc.onnx")
                .as_deref(),
            Some("mask_decoder.onnx")
        );
        // Empty/None falls back to the URL's last segment.
        assert_eq!(
            resolve_component_file_name(None, "https://host/path/image_encoder.onnx").as_deref(),
            Some("image_encoder.onnx")
        );
        assert_eq!(
            resolve_component_file_name(Some("   "), "https://host/path/tokenizer.json").as_deref(),
            Some("tokenizer.json")
        );
        // A traversal attempt is reduced to its final component.
        assert_eq!(
            resolve_component_file_name(Some("../../evil.onnx"), "https://x/y").as_deref(),
            Some("evil.onnx")
        );
    }

    #[test]
    fn resolves_prediction_label_by_name_case_insensitively() {
        let labels = vec![
            json!({
              "id": "label-1",
              "name": "Person",
              "color": "#0f172a",
            }),
            json!({
              "id": "label-2",
              "name": "Car",
              "color": "#2563eb",
            }),
        ];
        let draft = InferenceAnnotationDraft {
            name: "person".into(),
            annotation_type: "box".into(),
            coordinates: vec![],
            confidence: 0.91,
            label_id: None,
            label_name: Some("person".into()),
            label_color: None,
            is_ai_generated: true,
        };

        let resolved = resolve_prediction_label(&labels, &draft);

        assert_eq!(resolved.label_id.as_deref(), Some("label-1"));
        assert_eq!(resolved.label_name.as_deref(), Some("Person"));
        assert_eq!(resolved.label_color.as_deref(), Some("#0f172a"));
    }

    #[test]
    fn marks_non_onnx_detection_models_as_unsupported() {
        let metadata = build_model_metadata(Path::new("model.pt"), "", "detection", "yolo26", None)
            .expect("metadata should build");

        assert_eq!(
            metadata
                .metadata
                .get("supportsPrediction")
                .and_then(Value::as_bool),
            Some(false)
        );
        assert!(metadata
            .metadata
            .get("unsupportedReason")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .contains("ONNX"));
    }

    #[test]
    fn uses_conversion_message_for_pt_prediction_errors() {
        let metadata = build_model_metadata(
            Path::new("model.pt"),
            "",
            "detection",
            "yolo26",
            Some(&json!({
                "conversionMessage": "Install ultralytics to export this checkpoint to ONNX."
            })),
        )
        .expect("metadata should build");

        assert_eq!(
            metadata
                .metadata
                .get("unsupportedReason")
                .and_then(Value::as_str),
            Some("Install ultralytics to export this checkpoint to ONNX.")
        );
    }

    #[test]
    fn extracts_exported_onnx_path_from_command_output() {
        let output = "Export complete. Saved as C:\\models\\yolo26n.onnx";

        let path = extract_exported_onnx_path(output).expect("path should parse");

        assert_eq!(path, PathBuf::from("C:\\models\\yolo26n.onnx"));
    }

    #[test]
    fn replacement_filter_keeps_other_model_predictions() {
        let predictions = vec![
            json!({
              "id": "prediction-1",
              "modelId": "model-a",
              "imageId": "image-1",
            }),
            json!({
              "id": "prediction-2",
              "modelId": "model-b",
              "imageId": "image-1",
            }),
            json!({
              "id": "prediction-3",
              "modelId": "model-a",
              "imageId": "image-2",
            }),
        ];

        let ids = prediction_ids_for_replacement(&predictions, "model-a");

        assert_eq!(ids, vec!["prediction-1", "prediction-3"]);
    }
}
