mod store;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard};
use store::{DesktopStore, StoreError};
use tauri::Manager;
use uuid::Uuid;

const APP_NAME: &str = "Vailabel Studio";
const SERVICE_NAME: &str = "com.vailabel.studio";

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
struct DesktopRequest {
  method: String,
  path: String,
  body: Option<Value>,
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
struct DownloadSystemModelPayload {
  system_id: String,
  name: String,
  description: String,
  category: String,
  variant_name: Option<String>,
  version: String,
  download_url: String,
  expected_size: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemInfo {
  app_name: String,
  app_version: String,
  is_desktop: bool,
  platform: String,
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
    _ => {}
  }

  Ok(value)
}

fn patch_entity(store: &DesktopStore, kind: &str, id: &str, patch: Value) -> Result<Value, AppError> {
  let mut existing = store
    .get_entity(kind, id)?
    .ok_or_else(|| AppError::Message(format!("{kind} not found")))?;
  merge_patch(&mut existing, &patch);
  let normalized = normalize_entity(kind, existing)?;
  store.upsert_entity(kind, normalized.clone())?;
  Ok(normalized)
}

fn query_value(path: &str, key: &str) -> Option<String> {
  let (_, query) = path.split_once('?')?;
  query
    .split('&')
    .filter_map(|pair| pair.split_once('='))
    .find_map(|(candidate, value)| (candidate == key).then(|| value.to_string()))
}

fn strip_query(path: &str) -> &str {
  path.split_once('?').map(|(prefix, _)| prefix).unwrap_or(path)
}

fn desktop_request_inner(store: &DesktopStore, request: DesktopRequest) -> Result<Value, AppError> {
  let normalized_path = strip_query(request.path.trim_end_matches('/'));
  let segments: Vec<&str> = normalized_path
    .trim_start_matches('/')
    .split('/')
    .filter(|segment| !segment.is_empty())
    .collect();
  let method = request.method.to_uppercase();
  let body = request.body.unwrap_or(Value::Null);

  match (method.as_str(), segments.as_slice()) {
    ("GET", ["health"]) => Ok(json!(true)),
    ("GET", ["projects"]) => Ok(json!(store.list_entities("projects")?)),
    ("GET", ["projects", project_id]) => store
      .get_entity("projects", project_id)?
      .ok_or_else(|| AppError::Message("Project not found".into())),
    ("POST", ["projects"]) => Ok(store.upsert_entity("projects", normalize_entity("projects", body)?)?),
    ("PUT", ["projects", project_id]) => patch_entity(store, "projects", project_id, body),
    ("DELETE", ["projects", project_id]) => {
      store.delete_entity("projects", project_id)?;
      Ok(json!({ "success": true }))
    }

    ("GET", ["tasks"]) => Ok(json!(store.list_entities("tasks")?)),
    ("GET", ["tasks", "project", project_id]) => Ok(json!(store.list_by_field("tasks", "project_id", project_id)?)),
    ("GET", ["tasks", task_id]) => store
      .get_entity("tasks", task_id)?
      .ok_or_else(|| AppError::Message("Task not found".into())),
    ("POST", ["tasks"]) => Ok(store.upsert_entity("tasks", normalize_entity("tasks", body)?)?),
    ("PUT", ["tasks", task_id]) => patch_entity(store, "tasks", task_id, body),
    ("DELETE", ["tasks", task_id]) => {
      store.delete_entity("tasks", task_id)?;
      Ok(json!({ "success": true }))
    }

    ("GET", ["projects", project_id, "labels"]) => Ok(json!(store.list_by_field("labels", "project_id", project_id)?)),
    ("POST", ["labels"]) => Ok(store.upsert_entity("labels", normalize_entity("labels", body)?)?),
    ("PUT", ["labels", label_id]) => patch_entity(store, "labels", label_id, body),
    ("DELETE", ["labels", label_id]) => {
      store.delete_entity("labels", label_id)?;
      Ok(json!({ "success": true }))
    }

    ("GET", ["projects", project_id, "images"]) => Ok(json!(store.list_by_field("images", "project_id", project_id)?)),
    ("GET", ["projects", project_id, "images", "range"]) => {
      let images = store.list_by_field("images", "project_id", project_id)?;
      let offset = query_value(&request.path, "offset")
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(0);
      let limit = query_value(&request.path, "limit")
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(images.len());
      Ok(json!(images.into_iter().skip(offset).take(limit).collect::<Vec<_>>()))
    }
    ("GET", ["images", image_id]) => store
      .get_entity("images", image_id)?
      .ok_or_else(|| AppError::Message("Image not found".into())),
    ("POST", ["images"]) => Ok(store.upsert_entity("images", normalize_entity("images", body)?)?),
    ("PUT", ["images", image_id]) => patch_entity(store, "images", image_id, body),
    ("DELETE", ["images", image_id]) => {
      store.delete_entity("images", image_id)?;
      Ok(json!({ "success": true }))
    }

    ("GET", ["projects", project_id, "annotations"]) => Ok(json!(store.list_by_field("annotations", "project_id", project_id)?)),
    ("GET", ["images", image_id, "annotations"]) => Ok(json!(store.list_by_field("annotations", "image_id", image_id)?)),
    ("POST", ["annotations"]) => Ok(store.upsert_entity("annotations", normalize_entity("annotations", body)?)?),
    ("PUT", ["annotations", annotation_id]) => patch_entity(store, "annotations", annotation_id, body),
    ("DELETE", ["annotations", annotation_id]) => {
      store.delete_entity("annotations", annotation_id)?;
      Ok(json!({ "success": true }))
    }

    ("GET", ["projects", project_id, "history"]) => Ok(json!(store.list_by_field("history", "project_id", project_id)?)),
    ("POST", ["history"]) => Ok(store.upsert_entity("history", normalize_entity("history", body)?)?),

    ("GET", ["settings"]) => Ok(json!(store.list_entities("settings")?)),
    ("GET", ["settings", key]) => Ok(
      store
        .get_setting(key)?
        .unwrap_or_else(|| json!({ "id": Uuid::new_v4().to_string(), "key": key, "value": "" })),
    ),
    ("POST", ["settings"]) => Ok(store.upsert_setting(normalize_entity("settings", body)?)?),

    ("GET", ["ai-models"]) => Ok(json!(store.list_entities("ai_models")?)),
    ("GET", ["projects", project_id, "ai-models"]) => Ok(json!(store.list_by_field("ai_models", "project_id", project_id)?)),
    ("POST", ["ai-models"]) => Ok(store.upsert_entity("ai_models", normalize_entity("ai_models", body)?)?),
    ("PUT", ["ai-models", model_id]) => patch_entity(store, "ai_models", model_id, body),
    ("DELETE", ["ai-models", model_id]) => {
      store.delete_entity("ai_models", model_id)?;
      Ok(json!({ "success": true }))
    }

    ("GET", ["sync", "status"]) => Ok(json!({
      "status": "local-only",
      "pendingChanges": 0,
      "lastSyncedAt": Value::Null
    })),
    ("POST", ["sync", "data"]) | ("POST", ["sync", "project", _]) => Ok(json!({
      "status": "skipped",
      "message": "Desktop sync is not configured in the Rust-only local build."
    })),

    _ => Err(AppError::Message(format!("Unsupported request: {} {}", request.method, request.path))),
  }
}

#[tauri::command]
fn desktop_request(state: tauri::State<AppState>, request: DesktopRequest) -> Result<Value, AppError> {
  let store = state_guard(&state)?;
  desktop_request_inner(&store, request)
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

#[tauri::command]
fn download_system_model(
  app: tauri::AppHandle,
  state: tauri::State<AppState>,
  payload: DownloadSystemModelPayload,
) -> Result<Value, AppError> {
  let response = reqwest::blocking::get(&payload.download_url)
    .map_err(|error| AppError::Message(error.to_string()))?;

  if !response.status().is_success() {
    return Err(AppError::Message(format!(
      "Failed to download model asset: HTTP {}",
      response.status()
    )));
  }

  let bytes = response
    .bytes()
    .map_err(|error| AppError::Message(error.to_string()))?;

  let app_dir = app.path().app_data_dir()?;
  let models_dir = app_dir.join("models").join("system").join(&payload.system_id);
  fs::create_dir_all(&models_dir)?;

  let source_file_name = payload
    .download_url
    .rsplit('/')
    .next()
    .filter(|value| !value.is_empty())
    .unwrap_or("model.pt");

  let file_path = models_dir.join(source_file_name);
  let mut file = fs::File::create(&file_path)?;
  file.write_all(&bytes)?;

  let variant_suffix = payload
    .variant_name
    .clone()
    .map(|value| format!(" ({value})"))
    .unwrap_or_default();
  let model_id = format!(
    "{}-{}",
    payload.system_id,
    payload.variant_name.clone().unwrap_or_else(|| "default".into())
  );

  let type_value = match payload.category.as_str() {
    "segmentation" => "segmentation",
    "classification" => "classification",
    "pose" => "pose_estimation",
    "tracking" => "tracking",
    _ => "object_detection",
  };

  let model = normalize_entity(
    "ai_models",
    json!({
      "id": model_id,
      "name": format!("{}{}", payload.name, variant_suffix),
      "description": payload.description,
      "version": payload.version,
      "modelPath": file_path.to_string_lossy().to_string(),
      "configPath": "",
      "modelSize": payload.expected_size.unwrap_or(bytes.len() as u64),
      "isCustom": false,
      "isActive": false,
      "status": "ready",
      "category": payload.category,
      "type": type_value,
      "source": "system",
    }),
  )?;

  let store = state_guard(&state)?;
  Ok(store.upsert_entity("ai_models", model)?)
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
      desktop_request,
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
      download_system_model,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
