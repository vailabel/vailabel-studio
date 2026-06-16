//! Platform / system IPC commands: health, app info, file dialogs, filesystem
//! helpers, directory image scan, and the updater stub. These are inherent
//! I/O-boundary commands with no domain — they belong at the shell.

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

use crate::AppError;

const APP_NAME: &str = "Vailabel Studio";

const SUPPORTED_IMAGE_EXTENSIONS: &[&str] =
    &["png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff", "tif"];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DialogFilter {
    name: String,
    extensions: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenDialogRequest {
    directory: Option<bool>,
    multiple: Option<bool>,
    filters: Option<Vec<DialogFilter>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilePayload {
    path: String,
    data: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathPayload {
    path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryPayload {
    directory: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BaseNamePayload {
    file: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UrlPayload {
    url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    app_name: String,
    app_version: String,
    is_desktop: bool,
    platform: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannedImage {
    name: String,
    path: String,
    width: u32,
    height: u32,
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
pub fn health() -> bool {
    true
}

#[tauri::command]
pub fn system_info(app: tauri::AppHandle) -> SystemInfo {
    SystemInfo {
        app_name: APP_NAME.to_string(),
        app_version: app.package_info().version.to_string(),
        is_desktop: true,
        platform: std::env::consts::OS.to_string(),
    }
}

#[tauri::command]
pub fn open_path_dialog(request: OpenDialogRequest) -> Vec<String> {
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
pub fn open_external(payload: UrlPayload) -> Result<(), AppError> {
    open::that(payload.url).map_err(|error| AppError::Message(error.to_string()))?;
    Ok(())
}

#[tauri::command]
pub fn fs_ensure_directory(payload: PathPayload) -> Result<(), AppError> {
    fs::create_dir_all(payload.path)?;
    Ok(())
}

#[tauri::command]
pub fn fs_save_image(payload: FilePayload) -> Result<(), AppError> {
    let path = PathBuf::from(&payload.path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let bytes = decode_file_bytes(&payload.data)?;
    fs::write(path, bytes)?;
    Ok(())
}

#[tauri::command]
pub fn fs_load_image(payload: PathPayload) -> Result<String, AppError> {
    Ok(BASE64.encode(fs::read(payload.path)?))
}

#[tauri::command]
pub fn fs_delete_image(payload: PathPayload) -> Result<(), AppError> {
    if Path::new(&payload.path).exists() {
        fs::remove_file(payload.path)?;
    }
    Ok(())
}

#[tauri::command]
pub fn fs_list_images(payload: DirectoryPayload) -> Result<Vec<String>, AppError> {
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
pub fn fs_write_text_file(payload: FilePayload) -> Result<(), AppError> {
    let path = PathBuf::from(&payload.path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, payload.data)?;
    Ok(())
}

#[tauri::command]
pub fn fs_read_text_file(payload: PathPayload) -> Result<Option<String>, AppError> {
    let path = PathBuf::from(&payload.path);
    if !path.exists() {
        return Ok(None);
    }
    Ok(Some(fs::read_to_string(path)?))
}

#[tauri::command]
pub fn fs_get_base_name(payload: BaseNamePayload) -> String {
    Path::new(&payload.file)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_string()
}

/// Scan a directory for image files, returning each file's absolute path, name,
/// and dimensions. Reads only image headers (no full decode, no base64), so
/// large folders stay fast. Width/height fall back to 0 when the format is not
/// decodable here; the frontend recomputes those lazily from the loaded asset.
#[tauri::command]
pub fn images_scan_directory(payload: DirectoryPayload) -> Result<Vec<ScannedImage>, AppError> {
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
pub fn allow_image_directory(
    app: tauri::AppHandle,
    payload: PathPayload,
) -> Result<(), AppError> {
    app.asset_protocol_scope()
        .allow_directory(&payload.path, true)
        .map_err(|error| AppError::Message(error.to_string()))?;
    Ok(())
}

#[tauri::command]
pub fn updater_status() -> Value {
    json!({
      "supported": false,
      "status": "unavailable",
      "message": "Tauri updater is not configured for this local build yet."
    })
}
