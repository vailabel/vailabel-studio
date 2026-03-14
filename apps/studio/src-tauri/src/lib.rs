mod store;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::fs;
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
  auth_token: Option<String>,
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
    "permissions" => {
      ensure_string_field(object, "name", "permission");
      ensure_string_field(object, "resource", "app");
      ensure_string_field(object, "action", "read");
    }
    "roles" => {
      ensure_string_field(object, "name", "role");
      object.entry("permissions").or_insert_with(|| json!([]));
    }
    "users" => {
      ensure_string_field(object, "email", "");
      ensure_string_field(object, "name", "User");
      ensure_string_field(object, "password", "admin123");
      ensure_string_field(object, "role", "user");
      mirror_alias(object, "roleId", "role_id");
      object.entry("roles").or_insert_with(|| json!(["user"]));
      object.entry("permissions").or_insert_with(|| json!([]));
      object.entry("userPermissions").or_insert_with(|| json!([]));
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

fn find_by_id(items: &[Value], id: &str) -> Option<Value> {
  items.iter().find(|item| item.get("id").and_then(Value::as_str) == Some(id)).cloned()
}

fn with_auth_user(store: &DesktopStore, auth_token: Option<&str>) -> Result<Value, AppError> {
  let token = auth_token.ok_or_else(|| AppError::Message("Authentication required".into()))?;
  let user_id = store
    .resolve_token(token)?
    .ok_or_else(|| AppError::Message("Unauthorized".into()))?;
  store
    .get_entity("users", &user_id)?
    .ok_or_else(|| AppError::Message("Unauthorized".into()))
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

    ("POST", ["auth", "login"]) => {
      let email = body.get("email").and_then(Value::as_str).unwrap_or_default();
      let password = body.get("password").and_then(Value::as_str).unwrap_or_default();
      let user = store
        .find_user_by_credentials(email, password)?
        .ok_or_else(|| AppError::Message("Invalid credentials".into()))?;
      let user_id = user.get("id").and_then(Value::as_str).unwrap_or_default();
      let token = store.issue_token(user_id)?;
      Ok(json!({
        "access_token": token,
        "token_type": "bearer",
        "user": user
      }))
    }
    ("POST", ["auth", "logout"]) => {
      if let Some(token) = request.auth_token.as_deref() {
        store.revoke_token(token)?;
      }
      Ok(json!({ "success": true }))
    }
    ("GET", ["auth", "me"]) => with_auth_user(store, request.auth_token.as_deref()),

    ("GET", ["users"]) => Ok(json!(store.list_entities("users")?)),
    ("GET", ["users", user_id]) => store
      .get_entity("users", user_id)?
      .ok_or_else(|| AppError::Message("User not found".into())),
    ("POST", ["users"]) => Ok(store.upsert_entity("users", normalize_entity("users", body)?)?),
    ("PUT", ["users", user_id]) => patch_entity(store, "users", user_id, body),
    ("DELETE", ["users", user_id]) => {
      store.delete_entity("users", user_id)?;
      Ok(json!({ "success": true }))
    }
    ("GET", ["users", user_id, "permissions"]) => {
      let user = store
        .get_entity("users", user_id)?
        .ok_or_else(|| AppError::Message("User not found".into()))?;
      Ok(user.get("permissions").cloned().unwrap_or_else(|| json!([])))
    }
    ("POST", ["users", user_id, "permissions"]) => {
      let permission_ids = body.get("permission_ids").cloned().unwrap_or_else(|| json!([]));
      let mut user = store
        .get_entity("users", user_id)?
        .ok_or_else(|| AppError::Message("User not found".into()))?;
      as_object_mut(&mut user)?.insert("permissions".into(), permission_ids);
      let normalized = normalize_entity("users", user)?;
      Ok(store.upsert_entity("users", normalized)?)
    }
    ("POST", ["users", user_id, "role"]) => {
      let role_id = body
        .get("role_id")
        .and_then(Value::as_str)
        .ok_or_else(|| AppError::Message("role_id is required".into()))?;
      let roles = store.list_entities("roles")?;
      let role = find_by_id(&roles, role_id).ok_or_else(|| AppError::Message("Role not found".into()))?;
      let role_name = role.get("name").and_then(Value::as_str).unwrap_or("user").to_string();
      let mut user = store
        .get_entity("users", user_id)?
        .ok_or_else(|| AppError::Message("User not found".into()))?;
      let object = as_object_mut(&mut user)?;
      object.insert("role".into(), Value::String(role_name.clone()));
      object.insert("roleId".into(), Value::String(role_id.to_string()));
      object.insert("roles".into(), json!([role_name]));
      let normalized = normalize_entity("users", user)?;
      Ok(store.upsert_entity("users", normalized)?)
    }

    ("GET", ["permissions", "roles"]) => Ok(json!(store.list_entities("roles")?)),
    ("GET", ["permissions", "roles", role_id]) => store
      .get_entity("roles", role_id)?
      .ok_or_else(|| AppError::Message("Role not found".into())),
    ("POST", ["permissions", "roles"]) => Ok(store.upsert_entity("roles", normalize_entity("roles", body)?)?),
    ("PUT", ["permissions", "roles", role_id]) => patch_entity(store, "roles", role_id, body),
    ("DELETE", ["permissions", "roles", role_id]) => {
      store.delete_entity("roles", role_id)?;
      Ok(json!({ "success": true }))
    }
    ("GET", ["permissions"]) => Ok(json!(store.list_entities("permissions")?)),
    ("GET", ["permissions", permission_id]) => store
      .get_entity("permissions", permission_id)?
      .ok_or_else(|| AppError::Message("Permission not found".into())),
    ("POST", ["permissions"]) => Ok(store.upsert_entity("permissions", normalize_entity("permissions", body)?)?),
    ("PUT", ["permissions", permission_id]) => patch_entity(store, "permissions", permission_id, body),
    ("DELETE", ["permissions", permission_id]) => {
      store.delete_entity("permissions", permission_id)?;
      Ok(json!({ "success": true }))
    }

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
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
