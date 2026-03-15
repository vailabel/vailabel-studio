pub mod domain;
mod inference;
mod store;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use domain::images::service::ImageService;
use domain::labels::service::LabelService;
use domain::projects::service::ProjectService;
use domain::tasks::service::TaskService;
use image::GenericImageView;
use inference::InferenceEngine;
use keyring::Entry;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::fs;
use std::io::copy;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard};
use store::{DesktopStore, StoreError};
use tauri::{Emitter, Manager};
use uuid::Uuid;

const APP_NAME: &str = "Vailabel Studio";
const SERVICE_NAME: &str = "com.vailabel.studio";
const DOMAIN_EVENT_NAME: &str = "studio://domain-event";

#[derive(Clone)]
pub struct AppState {
    pub store: Arc<Mutex<DesktopStore>>,
    pub project_service: Arc<ProjectService>,
    pub task_service: Arc<TaskService>,
    pub label_service: Arc<LabelService>,
    pub image_service: Arc<ImageService>,
}

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Message(String),
    #[error(transparent)]
    Store(#[from] StoreError),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Reqwest(#[from] reqwest::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Yaml(#[from] serde_yaml::Error),
    #[error(transparent)]
    Keyring(#[from] keyring::Error),
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
    #[cfg(feature = "yolo-inference")]
    #[error(transparent)]
    Ort(#[from] ort::Error),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DialogFilter {
    name: String,
    extensions: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OpenDialogRequest {
    directory: Option<bool>,
    multiple: Option<bool>,
    filters: Option<Vec<DialogFilter>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FilePayload {
    path: String,
    data: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PathPayload {
    path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DirectoryPayload {
    directory: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BaseNamePayload {
    file: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SecretSetPayload {
    namespace: String,
    key: String,
    value: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SecretPayload {
    namespace: String,
    key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SecretListPayload {
    namespace: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UrlPayload {
    url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelImportPayload {
    name: String,
    description: String,
    version: String,
    category: String,
    #[serde(rename = "type")]
    model_type: String,
    model_file_path: String,
    config_file_path: Option<String>,
    project_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelInstallPayload {
    name: String,
    description: String,
    version: String,
    category: String,
    #[serde(rename = "type")]
    model_type: String,
    task_type: Option<String>,
    download_url: String,
    file_name: Option<String>,
    project_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EntityIdPayload {
    id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectIdPayload {
    project_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImageIdPayload {
    image_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImageRangePayload {
    project_id: String,
    offset: Option<usize>,
    limit: Option<usize>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PredictionGeneratePayload {
    image_id: String,
    model_id: String,
    threshold: Option<f32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PredictionActionPayload {
    prediction_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelActivationPayload {
    model_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InferencePoint {
    pub(crate) x: f32,
    pub(crate) y: f32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InferenceAnnotationDraft {
    pub(crate) name: String,
    #[serde(rename = "type")]
    pub(crate) annotation_type: String,
    pub(crate) coordinates: Vec<InferencePoint>,
    pub(crate) confidence: f32,
    pub(crate) label_id: Option<String>,
    pub(crate) label_name: Option<String>,
    pub(crate) label_color: Option<String>,
    pub(crate) is_ai_generated: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemInfo {
    app_name: String,
    app_version: String,
    is_desktop: bool,
    platform: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StudioDomainEvent {
    entity: String,
    action: String,
    id: String,
    project_id: Option<String>,
    image_id: Option<String>,
    occurred_at: String,
}

pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn state_guard<'a>(
    state: &'a tauri::State<AppState>,
) -> Result<MutexGuard<'a, DesktopStore>, AppError> {
    state
        .store
        .lock()
        .map_err(|_| AppError::Message("Desktop store is unavailable".into()))
}

fn as_object_mut(value: &mut Value) -> Result<&mut Map<String, Value>, AppError> {
    value
        .as_object_mut()
        .ok_or_else(|| AppError::Message("Expected object payload".into()))
}

fn merge_patch(target: &mut Value, patch: &Value) {
    match (target, patch) {
        (Value::Object(target_map), Value::Object(patch_map)) => {
            for (key, patch_value) in patch_map {
                if patch_value.is_null() {
                    target_map.remove(key);
                } else {
                    merge_patch(target_map.entry(key).or_insert(Value::Null), patch_value);
                }
            }
        }
        (target_value, patch_value) => {
            *target_value = patch_value.clone();
        }
    }
}

fn ensure_string_field(object: &mut Map<String, Value>, key: &str, default: &str) {
    if object
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or("")
        .is_empty()
    {
        object.insert(key.to_string(), Value::String(default.to_string()));
    }
}

fn mirror_alias(object: &mut Map<String, Value>, camel: &str, snake: &str) {
    if !object.contains_key(camel) {
        if let Some(value) = object.get(snake).cloned() {
            object.insert(camel.to_string(), value);
        }
    }
    if !object.contains_key(snake) {
        if let Some(value) = object.get(camel).cloned() {
            object.insert(snake.to_string(), value);
        }
    }
}

fn normalize_entity(kind: &str, mut value: Value) -> Result<Value, AppError> {
    let object = as_object_mut(&mut value)?;

    if object
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or("")
        .is_empty()
    {
        object.insert("id".into(), Value::String(Uuid::new_v4().to_string()));
    }
    if !object.contains_key("createdAt") {
        object.insert("createdAt".into(), Value::String(now_iso()));
    }
    object.insert("updatedAt".into(), Value::String(now_iso()));

    match kind {
        "projects" => {
            ensure_string_field(object, "name", "Untitled Project");
            ensure_string_field(object, "type", "image");
            ensure_string_field(object, "status", "active");
            object.entry("settings").or_insert_with(|| json!({}));
            object.entry("metadata").or_insert_with(|| json!({}));
        }
        "tasks" => {
            ensure_string_field(object, "name", "Untitled Task");
            ensure_string_field(object, "description", "");
            ensure_string_field(object, "status", "todo");
            mirror_alias(object, "projectId", "project_id");
            mirror_alias(object, "assignedTo", "assigned_to");
            mirror_alias(object, "dueDate", "due_date");
        }
        "labels" => {
            ensure_string_field(object, "name", "New Label");
            ensure_string_field(object, "color", "#2563eb");
            mirror_alias(object, "projectId", "project_id");
            object.entry("isAIGenerated").or_insert(Value::Bool(false));
        }
        "images" => {
            ensure_string_field(object, "name", "Untitled Image");
            ensure_string_field(object, "data", "");
            mirror_alias(object, "projectId", "project_id");
            object.entry("width").or_insert(Value::Number(0.into()));
            object.entry("height").or_insert(Value::Number(0.into()));
        }
        "annotations" => {
            ensure_string_field(object, "name", "Annotation");
            ensure_string_field(object, "type", "box");
            mirror_alias(object, "labelId", "label_id");
            mirror_alias(object, "imageId", "image_id");
            mirror_alias(object, "projectId", "project_id");
            object.entry("coordinates").or_insert_with(|| json!([]));
            object.entry("isAIGenerated").or_insert(Value::Bool(false));
        }
        "history" => {
            mirror_alias(object, "projectId", "project_id");
            object.entry("labels").or_insert_with(|| json!([]));
            object
                .entry("historyIndex")
                .or_insert(Value::Number(0.into()));
            object.entry("canUndo").or_insert(Value::Bool(false));
            object.entry("canRedo").or_insert(Value::Bool(false));
        }
        "settings" => {
            ensure_string_field(object, "key", "");
            object
                .entry("value")
                .or_insert(Value::String(String::new()));
        }
        "ai_models" => {
            ensure_string_field(object, "name", "Model");
            ensure_string_field(object, "description", "");
            ensure_string_field(object, "version", "1.0.0");
            ensure_string_field(object, "modelPath", "");
            ensure_string_field(object, "configPath", "");
            ensure_string_field(object, "status", "inactive");
            ensure_string_field(object, "category", "detection");
            ensure_string_field(object, "type", "object_detection");
            ensure_string_field(object, "backend", "cpu");
            ensure_string_field(object, "framework", "onnx");
            ensure_string_field(object, "labelsPath", "");
            ensure_string_field(object, "family", "");
            ensure_string_field(object, "variant", "");
            ensure_string_field(object, "taskType", "object_detection");
            ensure_string_field(object, "modelVersion", "");
            mirror_alias(object, "projectId", "project_id");
            object.entry("modelSize").or_insert(Value::Number(0.into()));
            object.entry("isCustom").or_insert(Value::Bool(true));
            object.entry("isActive").or_insert(Value::Bool(false));
            object.entry("stride").or_insert(Value::Number(0.into()));
            object
                .entry("defaultRank")
                .or_insert(Value::Number(999.into()));
            object
                .entry("supportsLabelStudioFormat")
                .or_insert(Value::Bool(false));
            object.entry("modelMetadata").or_insert_with(|| json!({}));
        }
        "predictions" => {
            ensure_string_field(object, "name", "Prediction");
            ensure_string_field(object, "type", "box");
            mirror_alias(object, "labelId", "label_id");
            mirror_alias(object, "labelName", "label_name");
            mirror_alias(object, "labelColor", "label_color");
            mirror_alias(object, "modelId", "model_id");
            mirror_alias(object, "imageId", "image_id");
            mirror_alias(object, "projectId", "project_id");
            mirror_alias(object, "fromName", "from_name");
            mirror_alias(object, "toName", "to_name");
            mirror_alias(object, "resultType", "result_type");
            mirror_alias(object, "modelVersion", "model_version");
            object.entry("coordinates").or_insert_with(|| json!([]));
            object.entry("confidence").or_insert_with(|| json!(0.0));
            object.entry("isAIGenerated").or_insert(Value::Bool(true));
            ensure_string_field(object, "fromName", "label");
            ensure_string_field(object, "toName", "image");
            ensure_string_field(object, "resultType", "rectanglelabels");
            ensure_string_field(object, "modelVersion", "");
            ensure_string_field(object, "family", "");
            ensure_string_field(object, "variant", "");
        }
        _ => {}
    }

    Ok(value)
}

fn get_entity_or_error(
    store: &DesktopStore,
    kind: &str,
    id: &str,
    message: &str,
) -> Result<Value, AppError> {
    store
        .get_entity(kind, id)?
        .ok_or_else(|| AppError::Message(message.to_string()))
}

fn save_entity(
    store: &DesktopStore,
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
    store: &DesktopStore,
    kind: &str,
    id: &str,
    message: &str,
) -> Result<Value, AppError> {
    let existing = get_entity_or_error(store, kind, id, message)?;
    store.delete_entity(kind, id)?;
    Ok(existing)
}

fn domain_event_from_value(entity: &str, action: &str, value: &Value) -> StudioDomainEvent {
    StudioDomainEvent {
        entity: entity.to_string(),
        action: action.to_string(),
        id: value_string(value, "id", "id").unwrap_or_default(),
        project_id: value_string(value, "projectId", "project_id"),
        image_id: value_string(value, "imageId", "image_id"),
        occurred_at: now_iso(),
    }
}

pub fn emit_domain_event(
    app: &tauri::AppHandle,
    entity: &str,
    action: &str,
    value: &Value,
) -> Result<(), AppError> {
    app.emit(
        DOMAIN_EVENT_NAME,
        domain_event_from_value(entity, action, value),
    )?;
    Ok(())
}

fn emit_domain_event_for_ids(
    app: &tauri::AppHandle,
    entity: &str,
    action: &str,
    id: String,
    project_id: Option<String>,
    image_id: Option<String>,
) -> Result<(), AppError> {
    app.emit(
        DOMAIN_EVENT_NAME,
        StudioDomainEvent {
            entity: entity.to_string(),
            action: action.to_string(),
            id,
            project_id,
            image_id,
            occurred_at: now_iso(),
        },
    )?;
    Ok(())
}

fn list_entities_for(state: &tauri::State<AppState>, kind: &str) -> Result<Vec<Value>, AppError> {
    Ok(state_guard(state)?.list_entities(kind)?)
}

fn list_by_project_for(
    state: &tauri::State<AppState>,
    kind: &str,
    project_id: &str,
) -> Result<Vec<Value>, AppError> {
    Ok(state_guard(state)?.list_by_field(kind, "project_id", project_id)?)
}

fn list_by_image_for(
    state: &tauri::State<AppState>,
    kind: &str,
    image_id: &str,
) -> Result<Vec<Value>, AppError> {
    Ok(state_guard(state)?.list_by_field(kind, "image_id", image_id)?)
}

fn get_entity_for(
    state: &tauri::State<AppState>,
    kind: &str,
    id: &str,
    message: &str,
) -> Result<Value, AppError> {
    let store = state_guard(state)?;
    get_entity_or_error(&store, kind, id, message)
}

fn save_entity_for(
    app: &tauri::AppHandle,
    state: &tauri::State<AppState>,
    kind: &str,
    event_entity: &str,
    payload: Value,
) -> Result<Value, AppError> {
    let store = state_guard(state)?;
    let (value, action) = save_entity(&store, kind, payload)?;
    emit_domain_event(app, event_entity, action, &value)?;
    Ok(value)
}

fn delete_entity_for(
    app: &tauri::AppHandle,
    state: &tauri::State<AppState>,
    kind: &str,
    event_entity: &str,
    id: &str,
    message: &str,
) -> Result<Value, AppError> {
    let store = state_guard(state)?;
    let existing = delete_entity(&store, kind, id, message)?;
    emit_domain_event(app, event_entity, "deleted", &existing)?;
    Ok(json!({ "success": true }))
}

#[tauri::command]
fn health() -> bool {
    true
}

#[tauri::command]
fn annotations_list_by_project(
    state: tauri::State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Vec<Value>, AppError> {
    list_by_project_for(&state, "annotations", &payload.project_id)
}

#[tauri::command]
fn annotations_list_by_image(
    state: tauri::State<AppState>,
    payload: ImageIdPayload,
) -> Result<Vec<Value>, AppError> {
    list_by_image_for(&state, "annotations", &payload.image_id)
}

#[tauri::command]
fn annotations_save(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    save_entity_for(&app, &state, "annotations", "annotations", payload)
}

#[tauri::command]
fn annotations_delete(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    payload: EntityIdPayload,
) -> Result<Value, AppError> {
    delete_entity_for(
        &app,
        &state,
        "annotations",
        "annotations",
        &payload.id,
        "Annotation not found",
    )
}

#[tauri::command]
fn history_list_by_project(
    state: tauri::State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Vec<Value>, AppError> {
    list_by_project_for(&state, "history", &payload.project_id)
}

#[tauri::command]
fn history_save(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    save_entity_for(&app, &state, "history", "history", payload)
}

#[tauri::command]
fn settings_list(state: tauri::State<AppState>) -> Result<Vec<Value>, AppError> {
    list_entities_for(&state, "settings")
}

#[tauri::command]
fn settings_get(
    state: tauri::State<AppState>,
    payload: EntityIdPayload,
) -> Result<Value, AppError> {
    let store = state_guard(&state)?;
    Ok(store.get_setting(&payload.id)?.unwrap_or_else(
        || json!({ "id": Uuid::new_v4().to_string(), "key": payload.id, "value": "" }),
    ))
}

#[tauri::command]
fn settings_set(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let key = value_string(&payload, "key", "key").unwrap_or_default();
    let store = state_guard(&state)?;
    let action = if !key.is_empty() && store.get_setting(&key)?.is_some() {
        "updated"
    } else {
        "created"
    };
    let value = store.upsert_setting(normalize_entity("settings", payload)?)?;
    emit_domain_event(&app, "settings", action, &value)?;
    Ok(value)
}

#[tauri::command]
fn ai_models_list(state: tauri::State<AppState>) -> Result<Vec<Value>, AppError> {
    let store = state_guard(&state)?;
    hydrate_ai_models(&store, store.list_entities("ai_models")?)
}

#[tauri::command]
fn ai_models_list_by_project(
    state: tauri::State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Vec<Value>, AppError> {
    let store = state_guard(&state)?;
    hydrate_ai_models(
        &store,
        store.list_by_field("ai_models", "project_id", &payload.project_id)?,
    )
}

#[tauri::command]
fn ai_models_save(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    save_entity_for(&app, &state, "ai_models", "ai_models", payload)
}

#[tauri::command]
fn ai_models_delete(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    payload: EntityIdPayload,
) -> Result<Value, AppError> {
    delete_entity_for(
        &app,
        &state,
        "ai_models",
        "ai_models",
        &payload.id,
        "AI model not found",
    )
}

#[tauri::command]
fn system_info(app: tauri::AppHandle) -> SystemInfo {
    SystemInfo {
        app_name: APP_NAME.to_string(),
        app_version: app.package_info().version.to_string(),
        is_desktop: true,
        platform: std::env::consts::OS.to_string(),
    }
}

#[tauri::command]
fn open_path_dialog(request: OpenDialogRequest) -> Vec<String> {
    let mut dialog = rfd::FileDialog::new();

    if let Some(filters) = request.filters {
        for filter in filters {
            let extensions = filter
                .extensions
                .iter()
                .map(String::as_str)
                .filter(|extension| *extension != "*")
                .collect::<Vec<_>>();
            if !extensions.is_empty() {
                dialog = dialog.add_filter(&filter.name, &extensions);
            }
        }
    }

    if request.directory.unwrap_or(false) {
        return dialog
            .pick_folder()
            .map(|path| vec![path.to_string_lossy().to_string()])
            .unwrap_or_default();
    }

    if request.multiple.unwrap_or(false) {
        dialog
            .pick_files()
            .unwrap_or_default()
            .into_iter()
            .map(|path| path.to_string_lossy().to_string())
            .collect()
    } else {
        dialog
            .pick_file()
            .map(|path| vec![path.to_string_lossy().to_string()])
            .unwrap_or_default()
    }
}

#[tauri::command]
fn open_external(payload: UrlPayload) -> Result<(), AppError> {
    open::that(payload.url).map_err(|error| AppError::Message(error.to_string()))?;
    Ok(())
}

pub(crate) fn decode_file_bytes(data: &str) -> Result<Vec<u8>, AppError> {
    let trimmed = data.trim();
    let encoded = trimmed
        .split_once(',')
        .map(|(_, value)| value)
        .unwrap_or(trimmed);
    BASE64
        .decode(encoded)
        .map_err(|error| AppError::Message(error.to_string()))
}

fn value_string(value: &Value, camel: &str, snake: &str) -> Option<String> {
    value
        .get(camel)
        .or_else(|| value.get(snake))
        .and_then(Value::as_str)
        .map(ToString::to_string)
}

fn value_u32(value: &Value, key: &str) -> Option<u32> {
    value
        .get(key)
        .and_then(Value::as_u64)
        .and_then(|number| u32::try_from(number).ok())
}

const DEFAULT_AI_LABEL_COLOR: &str = "#22c55e";
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
    let names = names
        .into_iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();

    if names.is_empty() {
        None
    } else {
        Some(names)
    }
}

fn extract_named_value_list(entries: &[Value]) -> Option<Vec<String>> {
    normalize_class_names(
        entries
            .iter()
            .filter_map(|entry| {
                entry.as_str().map(ToString::to_string).or_else(|| {
                    entry
                        .get("name")
                        .and_then(Value::as_str)
                        .map(ToString::to_string)
                })
            })
            .collect(),
    )
}

fn extract_named_value_map(entries: &Map<String, Value>) -> Option<Vec<String>> {
    let mut pairs = entries
        .iter()
        .filter_map(|(key, value)| value.as_str().map(|name| (key.clone(), name.to_string())))
        .collect::<Vec<_>>();
    if pairs.len() != entries.len() {
        return None;
    }

    pairs.sort_by(
        |left, right| match (left.0.parse::<usize>(), right.0.parse::<usize>()) {
            (Ok(left_index), Ok(right_index)) => left_index.cmp(&right_index),
            _ => left.0.cmp(&right.0),
        },
    );

    normalize_class_names(pairs.into_iter().map(|(_, value)| value).collect())
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

fn prediction_unsupported_reason(
    model_path: &Path,
    category: &str,
    has_class_names: bool,
) -> Option<String> {
    if !category.eq_ignore_ascii_case("detection") {
        return Some(
      "AI detect currently supports object-detection models only. Segmentation, pose, and open-vocabulary models are not wired up yet."
        .into(),
    );
    }

    let extension = model_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if extension != "onnx" {
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

    if class_names.is_empty() {
        if let Some(parsed) = parse_config_class_names(config_path)? {
            label_source = "config_file".into();
            class_names = parsed;
        } else if let Some(builtin) = builtin_class_names(family, category) {
            label_source = "builtin_catalog".into();
            class_names = builtin;
        }
    }

    let unsupported_reason =
        prediction_unsupported_reason(model_path, category, !class_names.is_empty());
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

fn hydrate_ai_model_entity(store: &DesktopStore, model: Value) -> Result<Value, AppError> {
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

fn hydrate_ai_models(store: &DesktopStore, models: Vec<Value>) -> Result<Vec<Value>, AppError> {
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

    let desired_name = draft
        .label_name
        .clone()
        .or_else(|| Some(draft.name.clone()))
        .filter(|value| !value.trim().is_empty());
    if let Some(label_name) = desired_name {
        if let Some(label) = find_project_label_by_name(labels, &label_name) {
            return ResolvedPredictionLabel {
                label_id: value_string(label, "id", "id"),
                label_name: value_string(label, "name", "name"),
                label_color: value_string(label, "color", "color")
                    .or_else(|| draft.label_color.clone()),
            };
        }

        return ResolvedPredictionLabel {
            label_id: None,
            label_name: Some(label_name),
            label_color: draft
                .label_color
                .clone()
                .or_else(|| Some(DEFAULT_AI_LABEL_COLOR.into())),
        };
    }

    ResolvedPredictionLabel {
        label_id: None,
        label_name: None,
        label_color: draft
            .label_color
            .clone()
            .or_else(|| Some(DEFAULT_AI_LABEL_COLOR.into())),
    }
}

fn prediction_ids_for_replacement(predictions: &[Value], model_id: &str) -> Vec<String> {
    predictions
        .iter()
        .filter_map(|prediction| {
            let prediction_model_id = value_string(prediction, "modelId", "model_id")?;
            if prediction_model_id == model_id {
                value_string(prediction, "id", "id")
            } else {
                None
            }
        })
        .collect()
}

fn infer_model_family_and_variant(name: &str, model_path: &Path) -> (String, String) {
    let haystack = format!(
        "{} {}",
        name.to_lowercase(),
        model_path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_lowercase()
    );

    let family = if haystack.contains("yoloe-26") {
        "yoloe-26"
    } else if haystack.contains("yolo26") {
        "yolo26"
    } else {
        ""
    };

    let variant = ["n", "s", "m", "l", "x"]
        .into_iter()
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
    let extension = model_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    match extension.as_str() {
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

fn find_existing_model_installation(
    store: &DesktopStore,
    category: &str,
    family: &str,
    variant: &str,
) -> Result<Option<Value>, AppError> {
    if family.is_empty() || variant.is_empty() {
        return Ok(None);
    }

    let normalized_category = category.trim().to_ascii_lowercase();
    let normalized_family = family.trim().to_ascii_lowercase();
    let normalized_variant = variant.trim().to_ascii_lowercase();

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
        let model_path = value_string(&model, "modelPath", "model_path").unwrap_or_default();

        if installed_category == normalized_category
            && installed_family == normalized_family
            && installed_variant == normalized_variant
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
}

fn build_ai_model_entity(input: AiModelEntityInput<'_>) -> Result<Value, AppError> {
    let model_size = fs::metadata(input.model_path)?.len();
    let (family, variant) = infer_model_family_and_variant(input.name, input.model_path);
    let task_type = input
        .task_type
        .unwrap_or_else(|| task_type_for_category(input.category));
    let model_version =
        build_model_version(input.name, input.version, &family, &variant, input.category);
    let default_rank = infer_default_rank(&family, input.category, &variant);
    let supports_label_studio_format = input.category == "detection"
        || input.category == "segmentation"
        || input.category == "pose";
    let (framework, backend) = infer_model_runtime(input.model_path);
    let metadata = build_model_metadata(
        input.model_path,
        input.config_path,
        input.category,
        &family,
        None,
    )?;
    let project_id = input.project_id.cloned();

    let mut model = json!({
      "id": input.model_id,
      "name": input.name,
      "description": input.description,
      "version": input.version,
      "modelPath": input.model_path.to_string_lossy().to_string(),
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

    if let Err(error) = download_result {
        let _ = fs::remove_file(&temp_download_path);
        return Err(error);
    }

    fs::rename(&temp_download_path, target_model_path)?;
    Ok(())
}

fn build_fallback_bbox(width: u32, height: u32) -> (u32, u32, u32, u32) {
    let left = (width as f32 * 0.2).round() as u32;
    let top = (height as f32 * 0.2).round() as u32;
    let right = (width as f32 * 0.8).round() as u32;
    let bottom = (height as f32 * 0.8).round() as u32;
    (left, top, right.max(left + 1), bottom.max(top + 1))
}

fn detect_salient_region(
    image_bytes: &[u8],
    threshold_bias: f32,
) -> Result<(u32, u32, u32, u32), AppError> {
    let image = image::load_from_memory(image_bytes).map_err(|error| {
        AppError::Message(format!("Failed to decode image for AI annotation: {error}"))
    })?;
    let grayscale = image.to_luma8();
    let (width, height) = grayscale.dimensions();

    if width == 0 || height == 0 {
        return Err(AppError::Message("Image has invalid dimensions".into()));
    }

    let mut brightness_total = 0u64;
    for pixel in grayscale.pixels() {
        brightness_total += u64::from(pixel.0[0]);
    }
    let pixel_count = u64::from(width) * u64::from(height);
    let average = brightness_total as f32 / pixel_count as f32;
    let threshold = (28.0 + threshold_bias * 64.0).clamp(16.0, 96.0);

    let mut min_x = width;
    let mut min_y = height;
    let mut max_x = 0u32;
    let mut max_y = 0u32;
    let mut hits = 0u32;

    for (x, y, pixel) in grayscale.enumerate_pixels() {
        let value = pixel.0[0] as f32;
        if (value - average).abs() >= threshold {
            min_x = min_x.min(x);
            min_y = min_y.min(y);
            max_x = max_x.max(x);
            max_y = max_y.max(y);
            hits += 1;
        }
    }

    if hits == 0 {
        return Ok(build_fallback_bbox(width, height));
    }

    let area = (max_x.saturating_sub(min_x) + 1) * (max_y.saturating_sub(min_y) + 1);
    let image_area = width * height;
    if area < image_area / 40 {
        return Ok(build_fallback_bbox(width, height));
    }

    let pad_x = ((max_x.saturating_sub(min_x) + 1) as f32 * 0.08).round() as u32;
    let pad_y = ((max_y.saturating_sub(min_y) + 1) as f32 * 0.08).round() as u32;

    Ok((
        min_x.saturating_sub(pad_x),
        min_y.saturating_sub(pad_y),
        (max_x + pad_x).min(width.saturating_sub(1)),
        (max_y + pad_y).min(height.saturating_sub(1)),
    ))
}

pub(crate) fn build_draft_annotations(
    image_value: &Value,
    model_value: &Value,
    labels: &[Value],
    threshold_bias: f32,
) -> Result<Vec<InferenceAnnotationDraft>, AppError> {
    let image_data = value_string(image_value, "data", "data")
        .ok_or_else(|| AppError::Message("Image data is unavailable for AI annotation".into()))?;
    let image_bytes = decode_file_bytes(&image_data)?;
    let (image_width, image_height) = image::load_from_memory(&image_bytes)
        .map(|image| image.dimensions())
        .unwrap_or((
            value_u32(image_value, "width").unwrap_or(1),
            value_u32(image_value, "height").unwrap_or(1),
        ));
    let (left, top, right, bottom) = detect_salient_region(&image_bytes, threshold_bias)?;

    let category =
        value_string(model_value, "category", "category").unwrap_or_else(|| "detection".into());
    let model_name = value_string(model_value, "name", "name").unwrap_or_else(|| "AI Model".into());
    let label = labels.first();
    let label_id = label.and_then(|entry| value_string(entry, "id", "id"));
    let label_name = label
        .and_then(|entry| value_string(entry, "name", "name"))
        .or_else(|| {
            Some(match category.as_str() {
                "segmentation" => "AI Region".into(),
                "pose" => "AI Pose Subject".into(),
                "classification" => "AI Classification".into(),
                _ => "AI Detection".into(),
            })
        });
    let label_color = label
        .and_then(|entry| value_string(entry, "color", "color"))
        .or_else(|| Some(DEFAULT_AI_LABEL_COLOR.into()));

    let annotation_type = if category == "segmentation" {
        "polygon"
    } else {
        "box"
    };

    let coordinates = if annotation_type == "polygon" {
        vec![
            InferencePoint {
                x: left as f32,
                y: top as f32,
            },
            InferencePoint {
                x: right as f32,
                y: top as f32,
            },
            InferencePoint {
                x: right as f32,
                y: bottom as f32,
            },
            InferencePoint {
                x: left as f32,
                y: bottom as f32,
            },
        ]
    } else {
        vec![
            InferencePoint {
                x: left as f32,
                y: top as f32,
            },
            InferencePoint {
                x: right as f32,
                y: bottom as f32,
            },
        ]
    };

    let bbox_area = ((right.saturating_sub(left) + 1) * (bottom.saturating_sub(top) + 1)) as f32;
    let image_area = (image_width.max(1) * image_height.max(1)) as f32;
    let confidence = (bbox_area / image_area).clamp(0.35, 0.94);

    Ok(vec![InferenceAnnotationDraft {
        name: label_name
            .clone()
            .unwrap_or_else(|| format!("{model_name} Draft")),
        annotation_type: annotation_type.into(),
        coordinates,
        confidence,
        label_id,
        label_name,
        label_color,
        is_ai_generated: true,
    }])
}

#[tauri::command]
fn fs_ensure_directory(payload: PathPayload) -> Result<(), AppError> {
    fs::create_dir_all(payload.path)?;
    Ok(())
}

#[tauri::command]
fn fs_save_image(payload: FilePayload) -> Result<(), AppError> {
    let path = PathBuf::from(&payload.path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let bytes = decode_file_bytes(&payload.data)?;
    fs::write(path, bytes)?;
    Ok(())
}

#[tauri::command]
fn fs_load_image(payload: PathPayload) -> Result<String, AppError> {
    Ok(BASE64.encode(fs::read(payload.path)?))
}

#[tauri::command]
fn fs_delete_image(payload: PathPayload) -> Result<(), AppError> {
    if Path::new(&payload.path).exists() {
        fs::remove_file(payload.path)?;
    }
    Ok(())
}

#[tauri::command]
fn fs_list_images(payload: DirectoryPayload) -> Result<Vec<String>, AppError> {
    let directory = PathBuf::from(payload.directory);
    if !directory.exists() {
        return Ok(Vec::new());
    }

    let mut files = Vec::new();
    for entry in fs::read_dir(directory)? {
        let entry = entry?;
        if entry.file_type()?.is_file() {
            files.push(entry.path().to_string_lossy().to_string());
        }
    }
    Ok(files)
}

#[tauri::command]
fn fs_get_base_name(payload: BaseNamePayload) -> String {
    Path::new(&payload.file)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_string()
}

fn keyring_entry(namespace: &str, key: &str) -> Result<Entry, AppError> {
    Ok(Entry::new(SERVICE_NAME, &format!("{namespace}:{key}"))?)
}

#[tauri::command]
fn secret_set(state: tauri::State<AppState>, payload: SecretSetPayload) -> Result<(), AppError> {
    keyring_entry(&payload.namespace, &payload.key)?.set_password(&payload.value)?;
    state_guard(&state)?.register_secret_key(&payload.namespace, &payload.key)?;
    Ok(())
}

#[tauri::command]
fn secret_get(payload: SecretPayload) -> Result<Option<String>, AppError> {
    let entry = keyring_entry(&payload.namespace, &payload.key)?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(AppError::Keyring(error)),
    }
}

#[tauri::command]
fn secret_delete(state: tauri::State<AppState>, payload: SecretPayload) -> Result<(), AppError> {
    let entry = keyring_entry(&payload.namespace, &payload.key)?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => {}
        Err(error) => return Err(AppError::Keyring(error)),
    }
    state_guard(&state)?.unregister_secret_key(&payload.namespace, &payload.key)?;
    Ok(())
}

#[tauri::command]
fn secret_list(
    state: tauri::State<AppState>,
    payload: SecretListPayload,
) -> Result<Vec<String>, AppError> {
    Ok(state_guard(&state)?.list_secret_keys(&payload.namespace)?)
}

#[tauri::command]
fn updater_status() -> Value {
    json!({
      "supported": false,
      "status": "unavailable",
      "message": "Tauri updater is not configured for this local build yet."
    })
}

fn ensure_prediction_label(
    store: &DesktopStore,
    prediction: &Value,
) -> Result<(Option<Value>, Option<Value>), AppError> {
    if let Some(label_id) = value_string(prediction, "labelId", "label_id") {
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

#[tauri::command]
fn ai_models_set_active(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    payload: ModelActivationPayload,
) -> Result<Value, AppError> {
    let store = state_guard(&state)?;
    let _ = get_entity_or_error(&store, "ai_models", &payload.model_id, "AI model not found")?;
    let models = store.list_entities("ai_models")?;

    for mut model in models {
        let model_id = value_string(&model, "id", "id").unwrap_or_default();
        {
            let object = as_object_mut(&mut model)?;
            let is_active = model_id == payload.model_id;
            object.insert("isActive".into(), Value::Bool(is_active));
            if is_active {
                object.insert("lastUsed".into(), Value::String(now_iso()));
            }
        }
        let normalized = normalize_entity("ai_models", model)?;
        store.upsert_entity("ai_models", normalized)?;
    }

    let active_model =
        get_entity_or_error(&store, "ai_models", &payload.model_id, "AI model not found")?;
    emit_domain_event(&app, "ai_models", "activated", &active_model)?;
    Ok(active_model)
}

#[tauri::command]
fn ai_models_import(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
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
    })?;

    let store = state_guard(&state)?;
    let model = store.upsert_entity("ai_models", model)?;
    emit_domain_event(&app, "ai_models", "created", &model)?;
    Ok(model)
}

#[tauri::command]
fn ai_models_install(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
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

    {
        let store = state_guard(&state)?;
        if let Some(existing) =
            find_existing_model_installation(&store, &payload.category, &family, &variant)?
        {
            return Ok(existing);
        }
    }

    let model_id = Uuid::new_v4().to_string();
    let app_dir = app.path().app_data_dir()?;
    let models_dir = app_dir.join("models").join("catalog").join(&model_id);
    fs::create_dir_all(&models_dir)?;

    let target_model_path = models_dir.join(&model_file_name);
    let install_result = (|| -> Result<Value, AppError> {
        download_model_asset(&payload.download_url, &target_model_path)?;

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
        })?;

        let store = state_guard(&state)?;
        let model = store.upsert_entity("ai_models", model)?;
        emit_domain_event(&app, "ai_models", "created", &model)?;
        Ok(model)
    })();

    if install_result.is_err() {
        let _ = fs::remove_file(&target_model_path);
        let _ = fs::remove_dir_all(&models_dir);
    }

    install_result
}

#[tauri::command]
fn predictions_list_by_image(
    state: tauri::State<AppState>,
    payload: ImageIdPayload,
) -> Result<Vec<Value>, AppError> {
    list_by_image_for(&state, "predictions", &payload.image_id)
}

#[tauri::command]
fn predictions_generate(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    payload: PredictionGeneratePayload,
) -> Result<Vec<Value>, AppError> {
    let image_id = payload.image_id.clone();
    let model_id = payload.model_id.clone();
    let store = state_guard(&state)?;
    let image = get_entity_or_error(&store, "images", &image_id, "Image not found")?;
    let model = hydrate_ai_model_entity(
        &store,
        get_entity_or_error(
            &store,
            "ai_models",
            &model_id,
            "Selected AI model was not found",
        )?,
    )?;

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
        store.list_by_field("labels", "project_id", &project_id)?
    };

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
    let mut engine: Box<dyn InferenceEngine> =
        Box::new(inference::YoloEngine::new(&model_path, class_names)?);
    #[cfg(not(feature = "yolo-inference"))]
    return Err(AppError::Message(
        "This desktop build does not include local ONNX inference support.".into(),
    ));

    let (drafts, metrics) =
        engine.predict(&image, &model, &labels, payload.threshold.unwrap_or(0.5))?;

    let existing_predictions = store.list_by_field("predictions", "image_id", &image_id)?;
    for prediction_id in prediction_ids_for_replacement(&existing_predictions, &model_id) {
        store.delete_entity("predictions", &prediction_id)?;
    }

    let mut predictions = Vec::new();
    let model_version = value_string(&model, "modelVersion", "model_version")
        .unwrap_or_else(|| value_string(&model, "version", "version").unwrap_or_default());
    let model_family = value_string(&model, "family", "family").unwrap_or_default();
    let model_variant = value_string(&model, "variant", "variant").unwrap_or_default();

    for draft in drafts {
        let resolved_label = resolve_prediction_label(&labels, &draft);
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
              "modelId": model_id.clone(),
              "model_id": model_id.clone(),
              "imageId": image_id.clone(),
              "image_id": image_id.clone(),
              "projectId": if project_id.is_empty() { Value::Null } else { Value::String(project_id.clone()) },
              "project_id": if project_id.is_empty() { Value::Null } else { Value::String(project_id.clone()) },
              "isAIGenerated": true,
              "backend": metrics.backend.clone(),
              "inferenceMs": metrics.infer_ms,
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
        let prediction = store.upsert_entity("predictions", prediction)?;
        predictions.push(prediction);
    }

    emit_domain_event_for_ids(
        &app,
        "predictions",
        "generated",
        image_id.clone(),
        if project_id.is_empty() {
            None
        } else {
            Some(project_id)
        },
        Some(image_id),
    )?;

    Ok(predictions)
}

#[tauri::command]
fn predictions_accept(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    payload: PredictionActionPayload,
) -> Result<Value, AppError> {
    let store = state_guard(&state)?;
    let prediction = get_entity_or_error(
        &store,
        "predictions",
        &payload.prediction_id,
        "Prediction not found",
    )?;
    let (label, created_label) = ensure_prediction_label(&store, &prediction)?;

    let label_id = label
        .as_ref()
        .and_then(|value| value_string(value, "id", "id"));
    let label_color = label
        .as_ref()
        .and_then(|value| value_string(value, "color", "color"))
        .or_else(|| value_string(&prediction, "labelColor", "label_color"))
        .unwrap_or_else(|| DEFAULT_AI_LABEL_COLOR.into());

    let annotation = normalize_entity(
        "annotations",
        json!({
          "name": value_string(&prediction, "name", "name").unwrap_or_else(|| "Prediction".into()),
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
    let annotation = store.upsert_entity("annotations", annotation)?;
    store.delete_entity("predictions", &payload.prediction_id)?;

    if let Some(created_label) = created_label {
        emit_domain_event(&app, "labels", "created", &created_label)?;
    }
    emit_domain_event(&app, "annotations", "created", &annotation)?;
    emit_domain_event(&app, "predictions", "accepted", &prediction)?;

    Ok(annotation)
}

#[tauri::command]
fn predictions_reject(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    payload: PredictionActionPayload,
) -> Result<Value, AppError> {
    let store = state_guard(&state)?;
    let prediction = delete_entity(
        &store,
        "predictions",
        &payload.prediction_id,
        "Prediction not found",
    )?;
    emit_domain_event(&app, "predictions", "rejected", &prediction)?;
    Ok(json!({ "success": true }))
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

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&app_dir)?;
            let store = DesktopStore::open(app_dir.join("vailabel-desktop.sqlite"))?;
            let store_arc = Arc::new(Mutex::new(store));
            let store_handle: Arc<dyn store::Store> =
                Arc::new(store::StoreHandle::new(store_arc.clone()));

            let project_repo = Arc::new(
                crate::domain::projects::repository::SqliteProjectRepository::new(
                    store_handle.clone(),
                ),
            );
            let project_service = Arc::new(crate::domain::projects::service::ProjectService::new(
                project_repo,
            ));
            let task_repo = Arc::new(crate::domain::tasks::repository::SqliteTaskRepository::new(
                store_handle.clone(),
            ));
            let task_service = Arc::new(crate::domain::tasks::service::TaskService::new(task_repo));
            let label_repo = Arc::new(
                crate::domain::labels::repository::SqliteLabelRepository::new(store_handle.clone()),
            );
            let label_service = Arc::new(crate::domain::labels::service::LabelService::new(
                label_repo,
            ));
            let image_repo = Arc::new(
                crate::domain::images::repository::SqliteImageRepository::new(store_handle.clone()),
            );
            let image_service = Arc::new(crate::domain::images::service::ImageService::new(
                image_repo,
            ));

            app.manage(AppState {
                store: store_arc,
                project_service,
                task_service,
                label_service,
                image_service,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            health,
            domain::projects::commands::projects_list,
            domain::projects::commands::projects_get,
            domain::projects::commands::projects_save,
            domain::projects::commands::projects_delete,
            domain::tasks::commands::tasks_list,
            domain::tasks::commands::tasks_list_by_project,
            domain::tasks::commands::tasks_get,
            domain::tasks::commands::tasks_save,
            domain::tasks::commands::tasks_delete,
            domain::labels::commands::labels_list_by_project,
            domain::labels::commands::labels_save,
            domain::labels::commands::labels_delete,
            domain::images::commands::images_list_by_project,
            domain::images::commands::images_list_range,
            domain::images::commands::images_get,
            domain::images::commands::images_save,
            domain::images::commands::images_delete,
            annotations_list_by_project,
            annotations_list_by_image,
            annotations_save,
            annotations_delete,
            history_list_by_project,
            history_save,
            settings_list,
            settings_get,
            settings_set,
            ai_models_list,
            ai_models_list_by_project,
            ai_models_save,
            ai_models_delete,
            ai_models_set_active,
            ai_models_import,
            ai_models_install,
            predictions_list_by_image,
            predictions_generate,
            predictions_accept,
            predictions_reject,
            system_info,
            open_path_dialog,
            open_external,
            fs_ensure_directory,
            fs_save_image,
            fs_load_image,
            fs_delete_image,
            fs_list_images,
            fs_get_base_name,
            secret_set,
            secret_get,
            secret_delete,
            secret_list,
            updater_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
