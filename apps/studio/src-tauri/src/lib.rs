#![recursion_limit = "256"]

pub mod composition;
pub mod commands;
pub mod analysis;
pub mod cloud;
pub mod video;
pub mod ai;
pub mod runtime;
pub mod copilot_ports;
pub mod plugins;
pub mod training_runtime;
mod gpu;
mod inference;
mod schema;
mod store;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use ai::service::AiService;
use analysis::service::AnalysisService;
use video::service::VideoService;
use keyring::Entry;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::fs;
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
    pub project_service: Arc<vailabel_project::application::ProjectAppService>,
    pub label_service: Arc<vailabel_annotation::application::LabelClassAppService>,
    pub image_service: Arc<vailabel_dataset::application::ImageAppService>,
    pub ai_service: Arc<AiService>,
    pub analysis_service: Arc<AnalysisService>,
    pub video_service: Arc<VideoService>,
    pub runtime_service: Arc<runtime_manager::RuntimeService>,
    pub plugin_registry: Arc<Mutex<vailabel_plugin::PluginRegistry>>,
    pub training_service: Arc<vailabel_training::application::TrainingAppService>,
    pub copilot_service: Arc<vailabel_copilot::application::CopilotAppService>,
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
    #[error(transparent)]
    Runtime(#[from] runtime_manager::RuntimeError),
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

pub(crate) fn as_object_mut(value: &mut Value) -> Result<&mut Map<String, Value>, AppError> {
    value
        .as_object_mut()
        .ok_or_else(|| AppError::Message("Expected object payload".into()))
}

pub(crate) fn merge_patch(target: &mut Value, patch: &Value) {
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

pub(crate) fn normalize_entity(kind: &str, mut value: Value) -> Result<Value, AppError> {
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
            // Legacy single-axis type kept valid for back-compat; the canonical
            // taxonomy going forward is the two-axis (modality, task) pair.
            ensure_string_field(object, "type", "object_detection");
            ensure_string_field(object, "modality", "image");
            ensure_string_field(object, "task", "detection");
            ensure_string_field(object, "status", "active");
            object.entry("settings").or_insert_with(|| json!({}));
            object.entry("metadata").or_insert_with(|| json!({}));
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

pub(crate) fn emit_domain_event_for_ids(
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

pub(crate) fn value_string(value: &Value, camel: &str, snake: &str) -> Option<String> {
    value
        .get(camel)
        .or_else(|| value.get(snake))
        .and_then(Value::as_str)
        .map(ToString::to_string)
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
fn fs_write_text_file(payload: FilePayload) -> Result<(), AppError> {
    let path = PathBuf::from(&payload.path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, payload.data)?;
    Ok(())
}

#[tauri::command]
fn fs_read_text_file(payload: PathPayload) -> Result<Option<String>, AppError> {
    let path = PathBuf::from(&payload.path);
    if !path.exists() {
        return Ok(None);
    }
    Ok(Some(fs::read_to_string(path)?))
}

#[tauri::command]
fn fs_get_base_name(payload: BaseNamePayload) -> String {
    Path::new(&payload.file)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_string()
}

const SUPPORTED_IMAGE_EXTENSIONS: &[&str] =
    &["png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff", "tif"];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScannedImage {
    name: String,
    path: String,
    width: u32,
    height: u32,
}

/// Scan a directory for image files, returning each file's absolute path, name,
/// and dimensions. Reads only image headers (no full decode, no base64), so
/// large folders stay fast. Width/height fall back to 0 when the format is not
/// decodable here; the frontend recomputes those lazily from the loaded asset.
#[tauri::command]
fn images_scan_directory(payload: DirectoryPayload) -> Result<Vec<ScannedImage>, AppError> {
    let directory = PathBuf::from(&payload.directory);
    if !directory.exists() {
        return Ok(Vec::new());
    }

    let mut images = Vec::new();
    for entry in fs::read_dir(&directory)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let is_image = path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| SUPPORTED_IMAGE_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
            .unwrap_or(false);
        if !is_image {
            continue;
        }

        let (width, height) = image::image_dimensions(&path).unwrap_or((0, 0));
        let name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or_default()
            .to_string();
        images.push(ScannedImage {
            name,
            path: path.to_string_lossy().to_string(),
            width,
            height,
        });
    }

    images.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(images)
}

/// Grant the asset protocol read access to a directory the user just opened so
/// `convertFileSrc` can render its images. Lets us keep the configured scope
/// tight while still supporting arbitrary "reference in place" folders.
#[tauri::command]
fn allow_image_directory(app: tauri::AppHandle, payload: PathPayload) -> Result<(), AppError> {
    app.asset_protocol_scope()
        .allow_directory(&payload.path, true)
        .map_err(|error| AppError::Message(error.to_string()))?;
    Ok(())
}

fn keyring_entry(namespace: &str, key: &str) -> Result<Entry, AppError> {
    Ok(Entry::new(SERVICE_NAME, &format!("{namespace}:{key}"))?)
}

/// Read a secret from the OS keychain, returning `None` when no entry exists.
/// Shared by the `secret_get` command and the cloud module (so secrets never
/// have to round-trip through the frontend to reach a backend operation).
pub(crate) fn read_secret(namespace: &str, key: &str) -> Result<Option<String>, AppError> {
    match keyring_entry(namespace, key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(AppError::Keyring(error)),
    }
}

#[tauri::command]
fn secret_set(state: tauri::State<AppState>, payload: SecretSetPayload) -> Result<(), AppError> {
    keyring_entry(&payload.namespace, &payload.key)?.set_password(&payload.value)?;
    state_guard(&state)?.register_secret_key(&payload.namespace, &payload.key)?;
    Ok(())
}

#[tauri::command]
fn secret_get(payload: SecretPayload) -> Result<Option<String>, AppError> {
    read_secret(&payload.namespace, &payload.key)
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

/// Locate an ONNX Runtime shared library bundled with the app (next to the
/// executable, or under app data) so `ORT_DYLIB_PATH` can point at it instead of
/// the system copy. Returns the first existing candidate.
#[cfg(feature = "yolo-inference")]
fn resolve_bundled_ort(app: &tauri::AppHandle) -> Option<PathBuf> {
    let lib = if cfg!(target_os = "windows") {
        "onnxruntime.dll"
    } else if cfg!(target_os = "macos") {
        "libonnxruntime.dylib"
    } else {
        "libonnxruntime.so"
    };

    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join(lib));
            candidates.push(dir.join("onnxruntime").join(lib));
        }
    }
    if let Ok(dir) = app.path().app_data_dir() {
        candidates.push(dir.join("onnxruntime").join(lib));
    }

    candidates.into_iter().find(|path| path.exists())
}

/// Prepend `dir` to the process `PATH` so DLLs alongside `onnxruntime.dll` (the
/// CUDA execution provider and cuDNN) resolve when the runtime is loaded.
#[cfg(feature = "yolo-inference")]
fn prepend_to_path(dir: &Path) {
    let mut entries: Vec<PathBuf> = std::env::var_os("PATH")
        .map(|value| std::env::split_paths(&value).collect())
        .unwrap_or_default();
    if entries.iter().any(|entry| entry == dir) {
        return;
    }
    entries.insert(0, dir.to_path_buf());
    if let Ok(joined) = std::env::join_paths(entries) {
        std::env::set_var("PATH", joined);
    }
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(feature = "yolo-inference")]
            {
                // Prefer an ONNX Runtime bundled with the app over whatever
                // Windows ships in System32 (CPU/DirectML-only, often a version
                // mismatch). Only set the path when we actually find one.
                if std::env::var_os("ORT_DYLIB_PATH").is_none() {
                    if let Some(path) = resolve_bundled_ort(app.handle()) {
                        // Make the runtime's own folder the first place the OS
                        // looks for the CUDA provider + cuDNN DLLs that sit next
                        // to onnxruntime.dll (the auto-installer drops them here).
                        if let Some(dir) = path.parent() {
                            prepend_to_path(dir);
                        }
                        std::env::set_var("ORT_DYLIB_PATH", path);
                    }
                }
                // Configure the global ONNX Runtime environment once on the main
                // thread. NOTE: `commit()` only sets the env config (returns false
                // if already set) — it does NOT load the dll, so its result is not
                // a usable load signal. The real load happens lazily on first use
                // and is reported by `gpu::gpu_info()` (see gpu.rs).
                let _ = ort::init().commit();
            }

            let app_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&app_dir)?;
            // One shared SQLite connection: the residual DesktopStore and the
            // per-module Diesel repositories all borrow this `Db`.
            let db = vailabel_db::Db::open(app_dir.join("vailabel-desktop.sqlite"))?;
            let store = DesktopStore::open(db.clone())?;
            let store_arc = Arc::new(Mutex::new(store));
            let entity_store: Arc<dyn store::EntityStore> =
                Arc::new(store::StoreHandle::new(store_arc.clone()));

            // Project module: a typed Diesel repository over the shared `db`,
            // plus a Tauri-backed EventPublisher. The binary's ProjectService is
            // a thin facade over the ProjectAppService.
            // Domain events fan out through an in-process bus to its subscribers;
            // the Tauri subscriber emits on `studio://domain-event` (wire format
            // unchanged). Add more subscribers (audit, integrations) here later.
            let event_subscribers: Vec<Arc<dyn vailabel_shared::EventSubscriber>> = vec![Arc::new(
                crate::composition::TauriEventSubscriber::new(app.handle().clone()),
            )];
            let event_publisher: Arc<dyn vailabel_shared::EventPublisher> =
                Arc::new(vailabel_shared::EventBus::new(event_subscribers));
            let project_repo: Arc<dyn vailabel_project::domain::ProjectRepository> = Arc::new(
                vailabel_project::infrastructure::DieselProjectRepository::new(db.clone()),
            );
            // Command handlers call these crate application services directly
            // (no binary facade); they are held in `AppState`.
            let project_service = Arc::new(vailabel_project::application::ProjectAppService::new(
                project_repo,
                event_publisher.clone(),
            ));
            let label_repo: Arc<dyn vailabel_annotation::domain::LabelRepository> = Arc::new(
                vailabel_annotation::infrastructure::DieselLabelRepository::new(db.clone()),
            );
            let label_service = Arc::new(
                vailabel_annotation::application::LabelClassAppService::new(
                    label_repo,
                    event_publisher.clone(),
                ),
            );
            let image_repo: Arc<dyn vailabel_dataset::domain::ImageRepository> = Arc::new(
                vailabel_dataset::infrastructure::DieselImageRepository::new(db.clone()),
            );
            let image_service = Arc::new(vailabel_dataset::application::ImageAppService::new(
                image_repo,
                event_publisher.clone(),
            ));
            let ai_service = Arc::new(crate::ai::service::AiService::new(
                entity_store.clone(),
            ));
            // Analysis module: source rows + reports persist through a binary
            // adapter over the residual store; the pixel decoder is the crate's
            // infrastructure. The binary AnalysisService owns the job lifecycle.
            let analysis_repo: Arc<dyn vailabel_analysis::domain::AnalysisRepository> = Arc::new(
                crate::analysis::repository::AnalysisStoreRepository::new(store_arc.clone()),
            );
            let analysis_decoder: Arc<dyn vailabel_analysis::application::ImageDecoder> =
                Arc::new(vailabel_analysis::infrastructure::ImageQualityDecoder::new());
            let analysis_app_service = Arc::new(vailabel_analysis::application::AnalysisAppService::new(
                analysis_repo,
                analysis_decoder,
            ));
            let analysis_service = Arc::new(
                crate::analysis::service::AnalysisService::new(analysis_app_service),
            );
            // Video module: persistence is a binary adapter over the residual
            // store; the FFmpeg pipeline is the crate's infrastructure. The
            // binary VideoService owns only the ingest job lifecycle.
            let video_repo: Arc<dyn vailabel_video::domain::VideoRepository> = Arc::new(
                crate::video::repository::VideoStoreRepository::new(store_arc.clone()),
            );
            let video_pipeline: Arc<dyn vailabel_video::application::VideoPipeline> =
                Arc::new(vailabel_video::infrastructure::FfmpegPipeline::new());
            let video_app_service = Arc::new(vailabel_video::application::VideoAppService::new(
                video_repo,
                video_pipeline,
                app_dir.join("video-frames"),
            ));
            let video_service = Arc::new(crate::video::service::VideoService::new(
                video_app_service,
            ));

            // Embedded AI Runtime. Built but NOT started here — the heavyweight
            // Python process spins up lazily on first training/export/heavy
            // inference (or an explicit Start). The monitor loop runs regardless
            // and reports `stopped` until then.
            let runtime_config = crate::runtime::glue::build_config(app.handle())?;
            let runtime_service =
                Arc::new(runtime_manager::RuntimeService::new(runtime_config));

            // Training module: typed Diesel repo over the shared `db`, the runtime
            // port backed by the runtime service, events via the shared publisher.
            let training_repo: Arc<dyn vailabel_training::domain::TrainingRepository> = Arc::new(
                vailabel_training::infrastructure::DieselTrainingRepository::new(db.clone())?,
            );
            let training_runtime: Arc<dyn vailabel_training::application::TrainingRuntime> =
                Arc::new(crate::training_runtime::BinaryTrainingRuntime::new(
                    runtime_service.clone(),
                ));
            let training_service = Arc::new(
                vailabel_training::application::TrainingAppService::new(
                    training_repo,
                    training_runtime,
                    event_publisher.clone(),
                ),
            );

            // Copilot module: the LLM brain (owns the resolution cache + reads
            // copilot settings/secret) and the grounding side (the AiService
            // predictions/pipeline engine + a cloned AppHandle + the store) as
            // ports behind the pure CopilotAppService.
            let copilot_llm: Arc<dyn vailabel_copilot::application::CopilotLlm> = Arc::new(
                crate::copilot_ports::BinaryCopilotLlm::new(entity_store.clone()),
            );
            let copilot_inference: Arc<dyn vailabel_copilot::application::CopilotInference> =
                Arc::new(crate::copilot_ports::BinaryCopilotInference::new(
                    ai_service.clone(),
                    entity_store.clone(),
                    app.handle().clone(),
                ));
            let copilot_service = Arc::new(
                vailabel_copilot::application::CopilotAppService::new(
                    copilot_llm,
                    copilot_inference,
                ),
            );

            // Plugin framework: register the runtime-backed reference detector and
            // drive it install→load→enable. Surfaced to the UI via `plugins_list`.
            let plugin_registry = {
                let mut registry = vailabel_plugin::PluginRegistry::new();
                let detector = Arc::new(crate::plugins::RuntimeDetectorPlugin::new(
                    runtime_service.clone(),
                ));
                registry.register_detector(detector)?;
                registry.load("runtime-detector")?;
                registry.enable("runtime-detector")?;
                Arc::new(Mutex::new(registry))
            };

            app.manage(AppState {
                store: store_arc,
                project_service,
                label_service,
                image_service,
                ai_service,
                analysis_service,
                video_service,
                runtime_service: runtime_service.clone(),
                plugin_registry,
                training_service,
                copilot_service,
            });

            // 10s health/metrics loop → frontend events. On a terminal crash,
            // reconcile any in-flight training jobs to "failed".
            let monitor_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                runtime_service
                    .run_monitor(move |evt| {
                        let _ = monitor_handle.emit(evt.channel(), evt.payload());
                        if let runtime_manager::RuntimeEvent::Status(s) = &evt {
                            if s.give_up
                                || matches!(s.state, runtime_manager::RuntimeState::Crashed)
                            {
                                crate::runtime::glue::reconcile_jobs_on_crash(
                                    &monitor_handle,
                                );
                            }
                        }
                    })
                    .await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            health,
            commands::projects::projects_list,
            commands::projects::projects_get,
            commands::projects::projects_save,
            commands::projects::projects_delete,
            commands::labels::labels_list_by_project,
            commands::labels::labels_save,
            commands::labels::labels_delete,
            commands::images::images_list_by_project,
            commands::images::images_list_range,
            commands::images::images_get,
            commands::images::images_save,
            commands::images::images_delete,
            annotations_list_by_project,
            annotations_list_by_image,
            annotations_save,
            annotations_delete,
            history_list_by_project,
            history_save,
            settings_list,
            settings_get,
            settings_set,
            commands::ai::ai_models_list,
            commands::ai::ai_models_list_by_project,
            commands::ai::ai_models_save,
            commands::ai::ai_models_delete,
            commands::ai::ai_models_set_active,
            commands::ai::ai_models_import,
            commands::ai::ai_models_install,
            commands::ai::ai_models_catalog_releases,
            commands::ai::predictions_list_by_image,
            commands::ai::predictions_generate,
            commands::ai::pipeline_run,
            commands::ai::predictions_accept,
            commands::ai::predictions_reject,
            commands::ai::ai_gpu_info,
            commands::ai::ai_model_registry,
            commands::ai::ai_runtime_install,
            commands::ai::ai_runtime_status,
            commands::ai::ai_runtime_restart,
            commands::ai::ai_copilot_turn,
            commands::ai::ai_copilot_apply_action,
            commands::ai::ai_copilot_test_connection,
            commands::analysis::analysis_run,
            commands::analysis::analysis_job_status,
            commands::analysis::analysis_reports_list,
            commands::analysis::analysis_report_get,
            commands::analysis::analysis_report_latest,
            commands::analysis::analysis_report_delete,
            commands::video::video_ffmpeg_info,
            commands::video::video_import,
            commands::video::video_list,
            commands::video::video_get,
            commands::video::video_delete,
            commands::video::video_ingest,
            commands::video::video_job_status,
            commands::video::video_tracks_list,
            commands::video::video_track_save,
            commands::video::video_track_delete,
            commands::video::video_export_tracks,
            commands::runtime::runtime_start,
            commands::runtime::runtime_stop,
            commands::runtime::runtime_restart,
            commands::runtime::runtime_status,
            commands::runtime::runtime_logs,
            commands::runtime::runtime_system_info,
            commands::runtime::runtime_detect,
            commands::runtime::runtime_segment,
            commands::runtime::runtime_caption,
            commands::runtime::runtime_ocr,
            commands::runtime::training_start,
            commands::runtime::training_stop,
            commands::runtime::training_list,
            commands::runtime::training_logs,
            commands::runtime::export_onnx,
            commands::runtime::export_tensorrt,
            commands::runtime::export_openvino,
            commands::runtime::runtime_models_list,
            commands::runtime::runtime_models_install,
            commands::runtime::runtime_models_delete,
            system_info,
            open_path_dialog,
            open_external,
            fs_ensure_directory,
            fs_save_image,
            fs_load_image,
            fs_delete_image,
            fs_list_images,
            fs_get_base_name,
            fs_write_text_file,
            fs_read_text_file,
            images_scan_directory,
            allow_image_directory,
            secret_set,
            secret_get,
            secret_delete,
            secret_list,
            commands::cloud::cloud_test_connection,
            commands::cloud::cloud_upload_files,
            commands::cloud::cloud_download_files,
            commands::cloud::cloud_delete_object,
            commands::cloud::cloud_list_objects,
            plugins::plugins_list,
            updater_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
