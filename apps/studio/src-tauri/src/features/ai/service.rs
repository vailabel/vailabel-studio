use crate::features::ai::model::{
    CopilotActionPayload, GitHubReleaseLookupPayload, InferenceAnnotationDraft, ModelImportPayload,
    ModelInstallPayload, PipelineRunPayload, PredictionGeneratePayload,
};
use vailabel_annotation::domain::{
    Annotation, AnnotationRepository, LabelClass, LabelRepository, Prediction, PredictionRepository,
};
use vailabel_dataset::domain::{Image, ImageRepository};
use vailabel_models::domain::{AiModel, AiModelRepository};
use crate::{
    as_object_mut, emit_domain_event, emit_domain_event_for_ids, merge_patch, now_iso,
    value_string, AppError,
};
use reqwest::blocking::Client;
use serde_json::{json, Value};
use std::fs;
use std::io::copy;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;
use std::time::Instant;
use tauri::Manager;
use uuid::Uuid;
use vailabel_models::domain::{
    build_model_version, builtin_class_names, class_token_matches, extract_class_names_from_value,
    infer_default_rank, infer_model_family_and_variant, infer_model_runtime, is_pytorch_checkpoint,
    model_extension, non_detection_reason, task_suffix, task_type_for_category,
};

const APP_NAME: &str = "Vailabel Studio";
const DEFAULT_AI_LABEL_COLOR: &str = "#22c55e";

/// Serialize a typed entity to plain camelCase JSON — used for the kinds whose
/// dedicated services round-trip through plain serde (labels / images).
fn to_json<T: serde::Serialize>(value: T) -> Result<Value, AppError> {
    Ok(serde_json::to_value(value)?)
}

/// AiService's private persistence shim: the JSON-in / JSON-out dispatch the
/// service's internal `Value` shaping relies on, scoped to the five kinds it
/// actually touches and backed by the owning modules' typed repositories. This
/// replaces the former shared `EntityStore` facade; the dual-key `to_value()`
/// (camel + snake) vs plain-serde split per kind preserves the wire contract.
#[derive(Clone)]
struct RepoStore {
    ai_models: Arc<dyn AiModelRepository>,
    predictions: Arc<dyn PredictionRepository>,
    annotations: Arc<dyn AnnotationRepository>,
    labels: Arc<dyn LabelRepository>,
    images: Arc<dyn ImageRepository>,
}

impl RepoStore {
    fn upsert_entity(&self, kind: &str, value: Value) -> Result<Value, AppError> {
        match kind {
            "ai_models" | "ai_model" => {
                let model: AiModel = serde_json::from_value(value)?;
                let (stored, _) = self.ai_models.save_atomic(&model)?;
                Ok(stored.to_value())
            }
            "predictions" | "prediction" => {
                let prediction: Prediction = serde_json::from_value(value)?;
                let (stored, _) = self.predictions.save_atomic(&prediction)?;
                Ok(stored.to_value())
            }
            "annotations" | "annotation" => {
                let annotation: Annotation = serde_json::from_value(value)?;
                let (stored, _) = self.annotations.save_atomic(&annotation)?;
                Ok(stored.to_value())
            }
            "labels" | "label" => {
                let label: LabelClass = serde_json::from_value(value)?;
                let (stored, _) = self.labels.save_atomic(&label)?;
                to_json(stored)
            }
            "images" | "image" => {
                let image: Image = serde_json::from_value(value)?;
                let (stored, _) = self.images.save_atomic(&image)?;
                to_json(stored)
            }
            other => Err(AppError::Message(format!("Unknown entity kind: {other}"))),
        }
    }

    fn get_entity(&self, kind: &str, id: &str) -> Result<Option<Value>, AppError> {
        match kind {
            "ai_models" | "ai_model" => Ok(self.ai_models.get(id)?.map(|m| m.to_value())),
            "predictions" | "prediction" => Ok(self.predictions.get(id)?.map(|p| p.to_value())),
            "annotations" | "annotation" => Ok(self.annotations.get(id)?.map(|a| a.to_value())),
            "labels" | "label" => self.labels.get(id)?.map(to_json).transpose(),
            "images" | "image" => self.images.get(id)?.map(to_json).transpose(),
            _ => Ok(None),
        }
    }

    fn list_entities(&self, kind: &str) -> Result<Vec<Value>, AppError> {
        match kind {
            "ai_models" | "ai_model" => {
                Ok(self.ai_models.list()?.iter().map(|m| m.to_value()).collect())
            }
            "predictions" | "prediction" => {
                Ok(self.predictions.list()?.iter().map(|p| p.to_value()).collect())
            }
            "annotations" | "annotation" => {
                Ok(self.annotations.list()?.iter().map(|a| a.to_value()).collect())
            }
            "labels" | "label" => self.labels.list()?.into_iter().map(to_json).collect(),
            "images" | "image" => self.images.list()?.into_iter().map(to_json).collect(),
            _ => Ok(Vec::new()),
        }
    }

    fn list_by_field(&self, kind: &str, field: &str, value: &str) -> Result<Vec<Value>, AppError> {
        match (kind, field) {
            ("ai_models" | "ai_model", "project_id") => Ok(self
                .ai_models
                .list_by_project(value)?
                .iter()
                .map(|m| m.to_value())
                .collect()),
            ("predictions" | "prediction", "image_id") => Ok(self
                .predictions
                .list_by_image(value)?
                .iter()
                .map(|p| p.to_value())
                .collect()),
            ("annotations" | "annotation", "image_id") => Ok(self
                .annotations
                .list_by_image(value)?
                .iter()
                .map(|a| a.to_value())
                .collect()),
            ("annotations" | "annotation", "project_id") => Ok(self
                .annotations
                .list_by_project(value)?
                .iter()
                .map(|a| a.to_value())
                .collect()),
            ("labels" | "label", "project_id") => {
                self.labels.list_by_project(value)?.into_iter().map(to_json).collect()
            }
            ("images" | "image", "project_id") => {
                self.images.list_by_project(value)?.into_iter().map(to_json).collect()
            }
            _ => Ok(Vec::new()),
        }
    }

    fn delete_entity(&self, kind: &str, id: &str) -> Result<(), AppError> {
        match kind {
            "ai_models" | "ai_model" => Ok(self.ai_models.delete(id)?),
            "predictions" | "prediction" => Ok(self.predictions.delete(id)?),
            "annotations" | "annotation" => Ok(self.annotations.delete(id)?),
            "labels" | "label" => Ok(self.labels.delete(id)?),
            "images" | "image" => Ok(self.images.delete(id)?),
            _ => Ok(()),
        }
    }
}

#[derive(Clone)]
pub struct AiService {
    store: RepoStore,
    /// The embedded Python AI runtime. Detection and promptable segmentation run
    /// here (ultralytics/torch), started on demand; the Rust side only orchestrates
    /// (entity reads, label resolution, persistence, events).
    runtime: Arc<runtime_manager::RuntimeService>,
}

impl AiService {
    pub fn new(
        runtime: Arc<runtime_manager::RuntimeService>,
        ai_models: Arc<dyn AiModelRepository>,
        predictions: Arc<dyn PredictionRepository>,
        annotations: Arc<dyn AnnotationRepository>,
        labels: Arc<dyn LabelRepository>,
        images: Arc<dyn ImageRepository>,
    ) -> Self {
        Self {
            store: RepoStore {
                ai_models,
                predictions,
                annotations,
                labels,
                images,
            },
            runtime,
        }
    }

    /// Object detection on the embedded Python runtime (ultralytics; loads `.onnx`
    /// or `.pt`). Starts the runtime on demand. Returns the raw detection drafts as
    /// JSON, to be deserialized via [`drafts_from_runtime`].
    fn runtime_detect(
        &self,
        model_path: &str,
        image_path: &str,
        conf: f32,
    ) -> Result<Vec<Value>, AppError> {
        let runtime = self.runtime.clone();
        let req = runtime_manager::DetectRequest {
            model_path: model_path.to_string(),
            image_path: image_path.to_string(),
            conf: Some(conf),
            iou: None,
        };
        let resp = tauri::async_runtime::block_on(async move {
            let client = runtime.ensure_started().await?;
            client.detect(&req).await
        })?;
        Ok(resp.detections)
    }

    /// Promptable segmentation (SAM) on the embedded Python runtime. Starts the
    /// runtime on demand. Returns the raw mask drafts as JSON.
    fn runtime_segment(
        &self,
        model_path: &str,
        image_path: &str,
        points: Vec<[f32; 2]>,
        box_xyxy: Option<[f32; 4]>,
    ) -> Result<Vec<Value>, AppError> {
        let runtime = self.runtime.clone();
        let req = runtime_manager::SegmentRequest {
            model_path: model_path.to_string(),
            image_path: image_path.to_string(),
            points,
            box_xyxy,
        };
        let resp = tauri::async_runtime::block_on(async move {
            let client = runtime.ensure_started().await?;
            client.segment(&req).await
        })?;
        Ok(resp.masks)
    }

    /// Deserialize raw runtime drafts (JSON) into typed `InferenceAnnotationDraft`s.
    fn drafts_from_runtime(
        items: Vec<Value>,
    ) -> Result<Vec<InferenceAnnotationDraft>, AppError> {
        items
            .into_iter()
            .map(|item| {
                serde_json::from_value::<InferenceAnnotationDraft>(item)
                    .map_err(|e| AppError::Message(format!("Malformed draft from AI runtime: {e}")))
            })
            .collect()
    }

    pub fn list_ai_models(&self) -> Result<Vec<Value>, AppError> {
        hydrate_ai_models(&self.store, self.store.list_entities("ai_models")?)
    }

    pub fn list_ai_models_by_project(&self, project_id: &str) -> Result<Vec<Value>, AppError> {
        hydrate_ai_models(
            &self.store,
            self.store
                .list_by_field("ai_models", "project_id", project_id)?,
        )
    }

    pub fn save_ai_model(&self, app: &tauri::AppHandle, payload: Value) -> Result<Value, AppError> {
        let (model, action) = save_entity(&self.store, "ai_models", payload)?;
        let model = hydrate_ai_model_entity(&self.store, model)?;
        emit_domain_event(app, "ai_models", action, &model)?;
        Ok(model)
    }

    pub fn delete_ai_model(&self, app: &tauri::AppHandle, id: &str) -> Result<Value, AppError> {
        let model = delete_entity(&self.store, "ai_models", id, "AI model not found")?;
        emit_domain_event(app, "ai_models", "deleted", &model)?;
        Ok(json!({ "success": true }))
    }

    pub fn set_active_model(
        &self,
        app: &tauri::AppHandle,
        model_id: &str,
    ) -> Result<Value, AppError> {
        let _ = get_entity_or_error(
            &self.store,
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
            self.store.upsert_entity("ai_models", model)?;
        }

        let active_model = get_entity_or_error(
            &self.store,
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

    /// Register an already-existing ONNX detector (e.g. weights produced by a
    /// finished training run and exported to ONNX) as a usable detection model.
    /// Seeds the class names so the model is prediction-ready for auto-labeling,
    /// and emits the same `ai_models` created event as a normal import — so it
    /// shows up in the model picker / auto-label control without a refresh.
    pub fn register_trained_onnx(
        &self,
        app: &tauri::AppHandle,
        model_path: &Path,
        name: &str,
        project_id: Option<&str>,
        class_names: Vec<String>,
    ) -> Result<Value, AppError> {
        let model_id = Uuid::new_v4().to_string();
        let seed_metadata = json!({ "classNames": class_names, "labelSource": "trained" });
        let project_id_owned = project_id.map(ToString::to_string);
        let model = build_ai_model_entity(AiModelEntityInput {
            model_id: &model_id,
            name,
            description: "Trained with the embedded runtime",
            version: "1.0.0",
            category: "detection",
            model_type: "detection",
            task_type: None,
            model_path,
            config_path: "",
            project_id: project_id_owned.as_ref(),
            source: "local",
            download_url: None,
            seed_metadata: Some(&seed_metadata),
        })?;
        let model = self.store.upsert_entity("ai_models", model)?;
        emit_domain_event(app, "ai_models", "created", &model)?;
        // Make the freshly trained model the active detector so the labeler's
        // Auto-label control auto-selects it — closes the train→auto-label loop.
        self.set_active_model(app, &model_id)
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
            &self.store,
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
    pub fn generate_predictions_filtered(
        &self,
        app: &tauri::AppHandle,
        payload: PredictionGeneratePayload,
        class_filter: Option<&str>,
    ) -> Result<Vec<Value>, AppError> {
        let image_id = payload.image_id.clone();
        let model_id = payload.model_id.clone();
        let image =
            get_entity_or_error(&self.store, "images", &image_id, "Image not found")?;

        // Runtime-catalog detector (e.g. "rtdetr-l"): the Python runtime fetches
        // its weights on first use, so there's no local file to resolve or
        // validate — run it by name. Imported/trained `ai_models` fall through.
        if let Some(weight) = crate::features::runtime::glue::runtime_model_weight(&model_id) {
            return self.generate_predictions_runtime(
                app,
                &image,
                &image_id,
                &model_id,
                weight,
                payload.threshold.unwrap_or(0.25),
                class_filter,
            );
        }

        let hydrated_model = hydrate_ai_model_entity(
            &self.store,
            get_entity_or_error(
                &self.store,
                "ai_models",
                &model_id,
                "Selected AI model was not found",
            )?,
        )?;
        let model = upgrade_model_for_local_inference(&self.store, hydrated_model.clone())?;
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

        // Detection runs on the embedded Python runtime (ultralytics; loads the
        // model's `.onnx`/`.pt`). Default conf 0.25 matches ultralytics' predict
        // default; 0.5 over-filtered freshly trained models (callers can pin it).
        let image_path = value_string(&image, "path", "path").ok_or_else(|| {
            AppError::Message("Image path is unavailable for AI detection".into())
        })?;
        let started_at = Instant::now();
        let detections =
            self.runtime_detect(&model_path, &image_path, payload.threshold.unwrap_or(0.25))?;
        let infer_ms = started_at.elapsed().as_millis();
        let drafts = Self::drafts_from_runtime(detections)?;

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
            "python",
            infer_ms,
            true,
        )
    }

    /// Detection via a runtime-catalog model: the ultralytics weight name (e.g.
    /// `rtdetr-l.pt`) is passed straight to the Python runtime, which fetches and
    /// caches it on first use. No local file, so none of the on-disk / task-suffix
    /// validation of the `ai_models` path applies.
    #[allow(clippy::too_many_arguments)]
    fn generate_predictions_runtime(
        &self,
        app: &tauri::AppHandle,
        image: &Value,
        image_id: &str,
        model_id: &str,
        weight: &str,
        conf: f32,
        class_filter: Option<&str>,
    ) -> Result<Vec<Value>, AppError> {
        let project_id = value_string(image, "projectId", "project_id").unwrap_or_default();
        let labels = if project_id.is_empty() {
            Vec::new()
        } else {
            self.store.list_by_field("labels", "project_id", &project_id)?
        };
        let image_path = value_string(image, "path", "path").ok_or_else(|| {
            AppError::Message("Image path is unavailable for AI detection".into())
        })?;

        let started_at = Instant::now();
        let detections = self.runtime_detect(weight, &image_path, conf)?;
        let infer_ms = started_at.elapsed().as_millis();
        let drafts = Self::drafts_from_runtime(detections)?;
        let drafts = match class_filter {
            Some(target) => drafts
                .into_iter()
                .filter(|draft| draft_matches_class(draft, target))
                .collect(),
            None => drafts,
        };

        let model = json!({ "id": model_id, "name": model_id, "backend": "python" });
        self.persist_drafts(
            app,
            image_id,
            &project_id,
            &model,
            model_id,
            &labels,
            drafts,
            "python",
            infer_ms,
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
            let prediction = json!({
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
                });
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
    /// [`crate::features::ai::plugin::ModelPlugin`] via [`plugin::plugin_for`] and
    /// passes the user's [`PromptInput`] (points/boxes/text) through to it.
    pub fn pipeline_run(
        &self,
        app: &tauri::AppHandle,
        payload: PipelineRunPayload,
    ) -> Result<Vec<Value>, AppError> {
        let image_id = payload.image_id.clone();
        let model_id = payload.model_id.clone();
        let image =
            get_entity_or_error(&self.store, "images", &image_id, "Image not found")?;

        // Runtime-catalog SAM (e.g. "sam2-base"): fetched on first use, no local
        // file to resolve. Imported/trained models fall through to the disk path.
        if let Some(weight) = crate::features::runtime::glue::runtime_model_weight(&model_id) {
            return self.pipeline_run_runtime(
                app,
                &image,
                &image_id,
                &model_id,
                weight,
                &payload.prompt,
            );
        }

        let model = hydrate_ai_model_entity(
            &self.store,
            get_entity_or_error(
                &self.store,
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

        // Segmentation runs on the embedded Python runtime (ultralytics SAM). Map
        // the prompt's points/boxes to the runtime's request shape; the runtime
        // takes a single box, so the first box prompt wins.
        let model_path = value_string(&model, "modelPath", "model_path").unwrap_or_default();
        if model_path.is_empty() {
            return Err(AppError::Message(
                "Selected segmentation model does not have a local file path".into(),
            ));
        }
        let points: Vec<[f32; 2]> = payload
            .prompt
            .points
            .iter()
            .map(|point| [point.x, point.y])
            .collect();
        let box_xyxy = payload
            .prompt
            .boxes
            .first()
            .map(|b| [b.x1, b.y1, b.x2, b.y2]);

        let started_at = Instant::now();
        let masks = self.runtime_segment(&model_path, &image_path, points, box_xyxy)?;
        let infer_ms = started_at.elapsed().as_millis();
        let drafts = Self::drafts_from_runtime(masks)?;

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
            "python",
            infer_ms,
            false,
        )
    }

    /// Promptable segmentation via a runtime-catalog model (e.g. SAM2): the weight
    /// name is passed to the Python runtime, which fetches it on first use. No
    /// local file, so the disk-path validation of the `ai_models` path is skipped.
    fn pipeline_run_runtime(
        &self,
        app: &tauri::AppHandle,
        image: &Value,
        image_id: &str,
        model_id: &str,
        weight: &str,
        prompt: &crate::features::ai::plugin::PromptInput,
    ) -> Result<Vec<Value>, AppError> {
        let image_path = value_string(image, "path", "path").ok_or_else(|| {
            AppError::Message("Image path is unavailable for AI annotation".into())
        })?;
        let project_id = value_string(image, "projectId", "project_id").unwrap_or_default();
        let labels = if project_id.is_empty() {
            Vec::new()
        } else {
            self.store.list_by_field("labels", "project_id", &project_id)?
        };

        let points: Vec<[f32; 2]> = prompt.points.iter().map(|point| [point.x, point.y]).collect();
        let box_xyxy = prompt.boxes.first().map(|b| [b.x1, b.y1, b.x2, b.y2]);

        let started_at = Instant::now();
        let masks = self.runtime_segment(weight, &image_path, points, box_xyxy)?;
        let infer_ms = started_at.elapsed().as_millis();
        let drafts = Self::drafts_from_runtime(masks)?;

        let model = json!({ "id": model_id, "name": model_id, "backend": "python" });
        self.persist_drafts(
            app, image_id, &project_id, &model, model_id, &labels, drafts, "python", infer_ms,
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
            &self.store,
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
                    &self.store,
                    "labels",
                    label_id,
                    "Selected label was not found",
                )?;
                (Some(label), None)
            }
            None => ensure_prediction_label(&self.store, &prediction)?,
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

        let annotation = json!({
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
        });
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
            &self.store,
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
    pub fn active_detector_class_names(&self) -> Vec<String> {
        let Ok(Some(model_id)) = self.resolve_model_id() else {
            return Vec::new();
        };
        let Ok(model) =
            get_entity_or_error(&self.store, "ai_models", &model_id, "AI model not found")
        else {
            return Vec::new();
        };
        let Ok(model) = hydrate_ai_model_entity(&self.store, model) else {
            return Vec::new();
        };
        model
            .get("modelMetadata")
            .and_then(extract_class_names_from_value)
            .unwrap_or_default()
    }

    pub fn resolve_model_id(&self) -> Result<Option<String>, AppError> {
        let models = self.store.list_entities("ai_models")?;
        if let Some(model) = models.iter().find(|model| {
            model
                .get("isActive")
                .and_then(Value::as_bool)
                .unwrap_or(false)
        }) {
            return Ok(value_string(model, "id", "id"));
        }
        if let Some(id) = models.first().and_then(|model| value_string(model, "id", "id")) {
            return Ok(Some(id));
        }
        // No imported/trained detector — fall back to the default runtime-catalog
        // detector, which the Python runtime fetches on first use.
        Ok(Some("rtdetr-l".to_string()))
    }

    /// Id of an installed segmentation (SAM) model, if any.
    pub fn resolve_segmentation_model_id(&self) -> Result<Option<String>, AppError> {
        let models = self.store.list_entities("ai_models")?;
        if let Some(id) = models
            .iter()
            .find(|model| matches!(registry_id_for_model(model).as_str(), "mobile-sam" | "sam2"))
            .and_then(|model| value_string(model, "id", "id"))
        {
            return Ok(Some(id));
        }
        // Fall back to the runtime-catalog SAM (fetched on first use).
        Ok(Some("sam2-base".to_string()))
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
                    &self.store,
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
                    &self.store,
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
                let saved = self.store.upsert_entity("annotations", annotation)?;
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

        let label = json!({
            "name": name,
            "projectId": project_id,
            "project_id": project_id,
            "color": DEFAULT_AI_LABEL_COLOR,
            "isAIGenerated": true,
        });
        let saved = self.store.upsert_entity("labels", label)?;
        Ok((saved, true))
    }
}

fn get_entity_or_error(
    store: &RepoStore,
    kind: &str,
    id: &str,
    message: &str,
) -> Result<Value, AppError> {
    store
        .get_entity(kind, id)?
        .ok_or_else(|| AppError::Message(message.to_string()))
}

fn save_entity(
    store: &RepoStore,
    kind: &str,
    payload: Value,
) -> Result<(Value, &'static str), AppError> {
    if let Some(id) = value_string(&payload, "id", "id") {
        if let Some(mut existing) = store.get_entity(kind, &id)? {
            merge_patch(&mut existing, &payload);
            let stored = store.upsert_entity(kind, existing)?;
            return Ok((stored, "updated"));
        }
    }

    let stored = store.upsert_entity(kind, payload)?;
    Ok((stored, "created"))
}

fn delete_entity(
    store: &RepoStore,
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
    store: &RepoStore,
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

    if upgraded != model {
        store.upsert_entity("ai_models", upgraded.clone())?;
    }

    Ok(upgraded)
}

fn hydrate_ai_model_entity(store: &RepoStore, model: Value) -> Result<Value, AppError> {
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
    if hydrated != model {
        store.upsert_entity("ai_models", hydrated.clone())?;
    }

    Ok(hydrated)
}

fn hydrate_ai_models(store: &RepoStore, models: Vec<Value>) -> Result<Vec<Value>, AppError> {
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

/// Best-effort mapping from an installed `ai_models` entity to a registry plugin
/// id (see [`crate::features::ai::registry`]), used when the caller didn't pass an
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
    store: &RepoStore,
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

    Ok(model)
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
    store: &RepoStore,
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

        let created_label = json!({
          "name": label_name,
          "color": value_string(prediction, "labelColor", "label_color")
            .unwrap_or_else(|| DEFAULT_AI_LABEL_COLOR.into()),
          "projectId": project_id,
          "project_id": project_id,
          "isAIGenerated": true,
        });
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
