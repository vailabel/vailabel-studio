#![recursion_limit = "256"]

pub mod domain;
mod gpu;
mod inference;
mod schema;
mod store;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use domain::ai::service::AiService;
use domain::analysis::service::AnalysisService;
use domain::images::service::ImageService;
use domain::labels::service::LabelService;
use domain::projects::service::ProjectService;
use domain::video::service::VideoService;
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
    pub project_service: Arc<ProjectService>,
    pub label_service: Arc<LabelService>,
    pub image_service: Arc<ImageService>,
    pub ai_service: Arc<AiService>,
    pub analysis_service: Arc<AnalysisService>,
    pub video_service: Arc<VideoService>,
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
    Cloud(#[from] opendal::Error),
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
            ensure_string_field(object, "type", "image");
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

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(feature = "yolo-inference")]
            {
                // Initialize ONNX Runtime environment once on the main thread
                // This can help prevent hangs when creating sessions in background threads
                ort::init().commit();
            }

            let app_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&app_dir)?;
            let store = DesktopStore::open(app_dir.join("vailabel-desktop.sqlite"))?;
            let store_arc = Arc::new(Mutex::new(store));
            let entity_store: Arc<dyn store::EntityStore> =
                Arc::new(store::StoreHandle::new(store_arc.clone()));

            let project_repo = Arc::new(
                crate::domain::projects::repository::SqliteProjectRepository::new(
                    entity_store.clone(),
                ),
            );
            let project_service = Arc::new(crate::domain::projects::service::ProjectService::new(
                project_repo,
            ));
            let label_repo = Arc::new(
                crate::domain::labels::repository::SqliteLabelRepository::new(entity_store.clone()),
            );
            let label_service = Arc::new(crate::domain::labels::service::LabelService::new(
                label_repo,
            ));
            let image_repo = Arc::new(
                crate::domain::images::repository::SqliteImageRepository::new(entity_store.clone()),
            );
            let image_service = Arc::new(crate::domain::images::service::ImageService::new(
                image_repo,
            ));
            let ai_service = Arc::new(crate::domain::ai::service::AiService::new(
                entity_store.clone(),
            ));
            let analysis_service = Arc::new(
                crate::domain::analysis::service::AnalysisService::new(store_arc.clone()),
            );
            let video_service = Arc::new(crate::domain::video::service::VideoService::new(
                store_arc.clone(),
                app_dir.join("video-frames"),
            ));

            app.manage(AppState {
                store: store_arc,
                project_service,
                label_service,
                image_service,
                ai_service,
                analysis_service,
                video_service,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            health,
            domain::projects::commands::projects_list,
            domain::projects::commands::projects_get,
            domain::projects::commands::projects_save,
            domain::projects::commands::projects_delete,
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
            domain::ai::commands::ai_models_list,
            domain::ai::commands::ai_models_list_by_project,
            domain::ai::commands::ai_models_save,
            domain::ai::commands::ai_models_delete,
            domain::ai::commands::ai_models_set_active,
            domain::ai::commands::ai_models_import,
            domain::ai::commands::ai_models_install,
            domain::ai::commands::ai_models_catalog_releases,
            domain::ai::commands::predictions_list_by_image,
            domain::ai::commands::predictions_generate,
            domain::ai::commands::predictions_accept,
            domain::ai::commands::predictions_reject,
            domain::ai::commands::ai_gpu_info,
            domain::ai::commands::ai_model_registry,
            domain::analysis::commands::analysis_run,
            domain::analysis::commands::analysis_job_status,
            domain::analysis::commands::analysis_reports_list,
            domain::analysis::commands::analysis_report_get,
            domain::analysis::commands::analysis_report_latest,
            domain::analysis::commands::analysis_report_delete,
            domain::video::commands::video_ffmpeg_info,
            domain::video::commands::video_import,
            domain::video::commands::video_list,
            domain::video::commands::video_get,
            domain::video::commands::video_delete,
            domain::video::commands::video_ingest,
            domain::video::commands::video_job_status,
            domain::video::commands::video_tracks_list,
            domain::video::commands::video_track_save,
            domain::video::commands::video_track_delete,
            domain::video::commands::video_export_tracks,
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
            domain::cloud::commands::cloud_test_connection,
            domain::cloud::commands::cloud_upload_files,
            domain::cloud::commands::cloud_download_files,
            domain::cloud::commands::cloud_delete_object,
            domain::cloud::commands::cloud_list_objects,
            updater_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
