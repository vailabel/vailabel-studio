mod store;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use image::GenericImageView;
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
struct AppState {
  store: Arc<Mutex<DesktopStore>>,
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
  Json(#[from] serde_json::Error),
  #[error(transparent)]
  Keyring(#[from] keyring::Error),
  #[error(transparent)]
  Tauri(#[from] tauri::Error),
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
  x: f32,
  y: f32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InferenceAnnotationDraft {
  name: String,
  #[serde(rename = "type")]
  annotation_type: String,
  coordinates: Vec<InferencePoint>,
  confidence: f32,
  label_id: Option<String>,
  label_name: Option<String>,
  label_color: Option<String>,
  is_ai_generated: bool,
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

fn now_iso() -> String {
  chrono::Utc::now().to_rfc3339()
}

fn state_guard<'a>(state: &'a tauri::State<AppState>) -> Result<MutexGuard<'a, DesktopStore>, AppError> {
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
  if object.get(key).and_then(Value::as_str).unwrap_or("").is_empty() {
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

  if object.get("id").and_then(Value::as_str).unwrap_or("").is_empty() {
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
      object.entry("historyIndex").or_insert(Value::Number(0.into()));
      object.entry("canUndo").or_insert(Value::Bool(false));
      object.entry("canRedo").or_insert(Value::Bool(false));
    }
    "settings" => {
      ensure_string_field(object, "key", "");
      object.entry("value").or_insert(Value::String(String::new()));
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
      mirror_alias(object, "projectId", "project_id");
      object.entry("modelSize").or_insert(Value::Number(0.into()));
      object.entry("isCustom").or_insert(Value::Bool(true));
      object.entry("isActive").or_insert(Value::Bool(false));
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
      object.entry("coordinates").or_insert_with(|| json!([]));
      object.entry("confidence").or_insert_with(|| json!(0.0));
      object.entry("isAIGenerated").or_insert(Value::Bool(true));
    }
    _ => {}
  }

  Ok(value)
}

fn get_entity_or_error(store: &DesktopStore, kind: &str, id: &str, message: &str) -> Result<Value, AppError> {
  store
    .get_entity(kind, id)?
    .ok_or_else(|| AppError::Message(message.to_string()))
}

fn save_entity(store: &DesktopStore, kind: &str, payload: Value) -> Result<(Value, &'static str), AppError> {
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

fn delete_entity(store: &DesktopStore, kind: &str, id: &str, message: &str) -> Result<Value, AppError> {
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

fn emit_domain_event(app: &tauri::AppHandle, entity: &str, action: &str, value: &Value) -> Result<(), AppError> {
  app.emit(DOMAIN_EVENT_NAME, domain_event_from_value(entity, action, value))?;
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
fn projects_list(state: tauri::State<AppState>) -> Result<Vec<Value>, AppError> {
  list_entities_for(&state, "projects")
}

#[tauri::command]
fn projects_get(state: tauri::State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
  get_entity_for(&state, "projects", &payload.id, "Project not found")
}

#[tauri::command]
fn projects_save(
  app: tauri::AppHandle,
  state: tauri::State<AppState>,
  payload: Value,
) -> Result<Value, AppError> {
  save_entity_for(&app, &state, "projects", "projects", payload)
}

#[tauri::command]
fn projects_delete(
  app: tauri::AppHandle,
  state: tauri::State<AppState>,
  payload: EntityIdPayload,
) -> Result<Value, AppError> {
  delete_entity_for(&app, &state, "projects", "projects", &payload.id, "Project not found")
}

#[tauri::command]
fn tasks_list(state: tauri::State<AppState>) -> Result<Vec<Value>, AppError> {
  list_entities_for(&state, "tasks")
}

#[tauri::command]
fn tasks_list_by_project(
  state: tauri::State<AppState>,
  payload: ProjectIdPayload,
) -> Result<Vec<Value>, AppError> {
  list_by_project_for(&state, "tasks", &payload.project_id)
}

#[tauri::command]
fn tasks_get(state: tauri::State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
  get_entity_for(&state, "tasks", &payload.id, "Task not found")
}

#[tauri::command]
fn tasks_save(
  app: tauri::AppHandle,
  state: tauri::State<AppState>,
  payload: Value,
) -> Result<Value, AppError> {
  save_entity_for(&app, &state, "tasks", "tasks", payload)
}

#[tauri::command]
fn tasks_delete(
  app: tauri::AppHandle,
  state: tauri::State<AppState>,
  payload: EntityIdPayload,
) -> Result<Value, AppError> {
  delete_entity_for(&app, &state, "tasks", "tasks", &payload.id, "Task not found")
}

#[tauri::command]
fn labels_list_by_project(
  state: tauri::State<AppState>,
  payload: ProjectIdPayload,
) -> Result<Vec<Value>, AppError> {
  list_by_project_for(&state, "labels", &payload.project_id)
}

#[tauri::command]
fn labels_save(
  app: tauri::AppHandle,
  state: tauri::State<AppState>,
  payload: Value,
) -> Result<Value, AppError> {
  save_entity_for(&app, &state, "labels", "labels", payload)
}

#[tauri::command]
fn labels_delete(
  app: tauri::AppHandle,
  state: tauri::State<AppState>,
  payload: EntityIdPayload,
) -> Result<Value, AppError> {
  delete_entity_for(&app, &state, "labels", "labels", &payload.id, "Label not found")
}

#[tauri::command]
fn images_list_by_project(
  state: tauri::State<AppState>,
  payload: ProjectIdPayload,
) -> Result<Vec<Value>, AppError> {
  list_by_project_for(&state, "images", &payload.project_id)
}

#[tauri::command]
fn images_list_range(
  state: tauri::State<AppState>,
  payload: ImageRangePayload,
) -> Result<Vec<Value>, AppError> {
  let images = list_by_project_for(&state, "images", &payload.project_id)?;
  let offset = payload.offset.unwrap_or(0);
  let limit = payload.limit.unwrap_or(images.len());
  Ok(images.into_iter().skip(offset).take(limit).collect())
}

#[tauri::command]
fn images_get(state: tauri::State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
  get_entity_for(&state, "images", &payload.id, "Image not found")
}

#[tauri::command]
fn images_save(
  app: tauri::AppHandle,
  state: tauri::State<AppState>,
  payload: Value,
) -> Result<Value, AppError> {
  save_entity_for(&app, &state, "images", "images", payload)
}

#[tauri::command]
fn images_delete(
  app: tauri::AppHandle,
  state: tauri::State<AppState>,
  payload: EntityIdPayload,
) -> Result<Value, AppError> {
  delete_entity_for(&app, &state, "images", "images", &payload.id, "Image not found")
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
fn settings_get(state: tauri::State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
  let store = state_guard(&state)?;
  Ok(store
    .get_setting(&payload.id)?
    .unwrap_or_else(|| json!({ "id": Uuid::new_v4().to_string(), "key": payload.id, "value": "" })))
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
  list_entities_for(&state, "ai_models")
}

#[tauri::command]
fn ai_models_list_by_project(
  state: tauri::State<AppState>,
  payload: ProjectIdPayload,
) -> Result<Vec<Value>, AppError> {
  list_by_project_for(&state, "ai_models", &payload.project_id)
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
  delete_entity_for(&app, &state, "ai_models", "ai_models", &payload.id, "AI model not found")
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

fn decode_file_bytes(data: &str) -> Result<Vec<u8>, AppError> {
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

fn build_fallback_bbox(width: u32, height: u32) -> (u32, u32, u32, u32) {
  let left = (width as f32 * 0.2).round() as u32;
  let top = (height as f32 * 0.2).round() as u32;
  let right = (width as f32 * 0.8).round() as u32;
  let bottom = (height as f32 * 0.8).round() as u32;
  (left, top, right.max(left + 1), bottom.max(top + 1))
}

fn detect_salient_region(image_bytes: &[u8], threshold_bias: f32) -> Result<(u32, u32, u32, u32), AppError> {
  let image = image::load_from_memory(image_bytes)
    .map_err(|error| AppError::Message(format!("Failed to decode image for AI annotation: {error}")))?;
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

fn build_draft_annotations(
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

  let category = value_string(model_value, "category", "category").unwrap_or_else(|| "detection".into());
  let model_name = value_string(model_value, "name", "name").unwrap_or_else(|| "AI Model".into());
  let label = labels.first();
  let label_id = label.and_then(|entry| value_string(entry, "id", "id"));
  let label_name = label
    .and_then(|entry| value_string(entry, "name", "name"))
    .or_else(|| Some(match category.as_str() {
      "segmentation" => "AI Region".into(),
      "pose" => "AI Pose Subject".into(),
      "classification" => "AI Classification".into(),
      _ => "AI Detection".into(),
    }));
  let label_color = label
    .and_then(|entry| value_string(entry, "color", "color"))
    .or_else(|| Some("#22c55e".into()));

  let annotation_type = if category == "segmentation" {
    "polygon"
  } else {
    "box"
  };

  let coordinates = if annotation_type == "polygon" {
    vec![
      InferencePoint { x: left as f32, y: top as f32 },
      InferencePoint { x: right as f32, y: top as f32 },
      InferencePoint { x: right as f32, y: bottom as f32 },
      InferencePoint { x: left as f32, y: bottom as f32 },
    ]
  } else {
    vec![
      InferencePoint { x: left as f32, y: top as f32 },
      InferencePoint { x: right as f32, y: bottom as f32 },
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
fn secret_list(state: tauri::State<AppState>, payload: SecretListPayload) -> Result<Vec<String>, AppError> {
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
    for label in store.list_by_field("labels", "project_id", &project_id)? {
      if value_string(&label, "name", "name")
        .map(|candidate| candidate.eq_ignore_ascii_case(&label_name))
        .unwrap_or(false)
      {
        return Ok((Some(label), None));
      }
    }

    let created_label = normalize_entity(
      "labels",
      json!({
        "name": label_name,
        "color": value_string(prediction, "labelColor", "label_color").unwrap_or_else(|| "#22c55e".into()),
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

  let active_model = get_entity_or_error(&store, "ai_models", &payload.model_id, "AI model not found")?;
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
    return Err(AppError::Message("Selected model file could not be found".into()));
  }

  let model_id = Uuid::new_v4().to_string();
  let app_dir = app.path().app_data_dir()?;
  let models_dir = app_dir.join("models").join("custom").join(&model_id);
  fs::create_dir_all(&models_dir)?;

  let model_file_name = source_model_path
    .file_name()
    .and_then(|value| value.to_str())
    .ok_or_else(|| AppError::Message("Selected model file path is invalid".into()))?;
  let target_model_path = models_dir.join(model_file_name);
  fs::copy(&source_model_path, &target_model_path)?;

  let target_config_path = if let Some(config_file_path) = payload.config_file_path.as_ref() {
    let source_config_path = PathBuf::from(config_file_path);
    if !source_config_path.exists() {
      return Err(AppError::Message("Selected config file could not be found".into()));
    }

    let config_file_name = source_config_path
      .file_name()
      .and_then(|value| value.to_str())
      .ok_or_else(|| AppError::Message("Selected config file path is invalid".into()))?;
    let target_config_path = models_dir.join(config_file_name);
    fs::copy(&source_config_path, &target_config_path)?;
    target_config_path.to_string_lossy().to_string()
  } else {
    String::new()
  };

  let model_size = fs::metadata(&target_model_path)?.len();
  let project_id = payload.project_id.clone();
  let model = normalize_entity(
    "ai_models",
    json!({
      "id": model_id,
      "name": payload.name,
      "description": payload.description,
      "version": payload.version,
      "modelPath": target_model_path.to_string_lossy().to_string(),
      "configPath": target_config_path,
      "modelSize": model_size,
      "isCustom": true,
      "isActive": false,
      "status": "ready",
      "category": payload.category,
      "type": payload.model_type,
      "projectId": project_id.clone(),
      "project_id": project_id,
      "source": "local",
    }),
  )?;

  let store = state_guard(&state)?;
  let model = store.upsert_entity("ai_models", model)?;
  emit_domain_event(&app, "ai_models", "created", &model)?;
  Ok(model)
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
  let model = get_entity_or_error(&store, "ai_models", &model_id, "Selected AI model was not found")?;

  let model_path = value_string(&model, "modelPath", "model_path").unwrap_or_default();
  if model_path.is_empty() {
    return Err(AppError::Message("Selected AI model does not have a local file path".into()));
  }
  if !Path::new(&model_path).exists() {
    return Err(AppError::Message("Selected AI model file could not be found on disk".into()));
  }

  let project_id = value_string(&image, "projectId", "project_id").unwrap_or_default();
  let labels = if project_id.is_empty() {
    Vec::new()
  } else {
    store.list_by_field("labels", "project_id", &project_id)?
  };

  let existing_predictions = store.list_by_field("predictions", "image_id", &image_id)?;
  for prediction in existing_predictions {
    let prediction_model_id = value_string(&prediction, "modelId", "model_id").unwrap_or_default();
    if prediction_model_id == model_id.as_str() {
      if let Some(prediction_id) = value_string(&prediction, "id", "id") {
        store.delete_entity("predictions", &prediction_id)?;
      }
    }
  }

  let drafts = build_draft_annotations(&image, &model, &labels, payload.threshold.unwrap_or(0.5))?;
  let mut predictions = Vec::new();

  for draft in drafts {
    let prediction = normalize_entity(
      "predictions",
      json!({
        "name": draft.name,
        "type": draft.annotation_type,
        "coordinates": draft.coordinates,
        "confidence": draft.confidence,
        "labelId": draft.label_id,
        "label_id": draft.label_id,
        "labelName": draft.label_name,
        "label_name": draft.label_name,
        "labelColor": draft.label_color,
        "label_color": draft.label_color,
        "color": draft.label_color,
        "modelId": model_id.clone(),
        "model_id": model_id.clone(),
        "imageId": image_id.clone(),
        "image_id": image_id.clone(),
        "projectId": if project_id.is_empty() { Value::Null } else { Value::String(project_id.clone()) },
        "project_id": if project_id.is_empty() { Value::Null } else { Value::String(project_id.clone()) },
        "isAIGenerated": true,
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
    if project_id.is_empty() { None } else { Some(project_id) },
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
  let prediction = get_entity_or_error(&store, "predictions", &payload.prediction_id, "Prediction not found")?;
  let (label, created_label) = ensure_prediction_label(&store, &prediction)?;

  let label_id = label
    .as_ref()
    .and_then(|value| value_string(value, "id", "id"));
  let label_color = label
    .as_ref()
    .and_then(|value| value_string(value, "color", "color"))
    .or_else(|| value_string(&prediction, "labelColor", "label_color"))
    .unwrap_or_else(|| "#22c55e".into());

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
  let prediction = delete_entity(&store, "predictions", &payload.prediction_id, "Prediction not found")?;
  emit_domain_event(&app, "predictions", "rejected", &prediction)?;
  Ok(json!({ "success": true }))
}

pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let app_dir = app.path().app_data_dir()?;
      fs::create_dir_all(&app_dir)?;
      let store = DesktopStore::open(app_dir.join("vailabel-desktop.sqlite"))?;
      app.manage(AppState {
        store: Arc::new(Mutex::new(store)),
      });
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      health,
      projects_list,
      projects_get,
      projects_save,
      projects_delete,
      tasks_list,
      tasks_list_by_project,
      tasks_get,
      tasks_save,
      tasks_delete,
      labels_list_by_project,
      labels_save,
      labels_delete,
      images_list_by_project,
      images_list_range,
      images_get,
      images_save,
      images_delete,
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
