//! Tauri-facing glue for the embedded AI runtime: resolves bundled resource
//! paths into a [`RuntimeConfiguration`], holds the downloadable-model catalog,
//! and streams weight downloads into app-data (reusing the same progress-event
//! style as `domain/ai/runtime_setup.rs`).

use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use tauri::{Emitter, Manager};
use uuid::Uuid;

use crate::AppError;
use runtime_manager::RuntimeConfiguration;
use vailabel_models::domain::{RuntimeModel, RuntimeModelRepository};

/// Persist a `runtime_models` row from its JSON shape through the typed repo,
/// returning the stored dual-key JSON. Mirrors the former `EntityStore`
/// `runtime_model` arm (no `normalize_entity` — the JSON deserializes straight
/// into the aggregate, and partial best-effort updates that fail are ignored).
fn upsert_runtime_model(
    repo: &Arc<dyn RuntimeModelRepository>,
    value: Value,
) -> Result<Value, AppError> {
    let model: RuntimeModel = serde_json::from_value(value)?;
    let (stored, _) = repo.save_atomic(&model)?;
    Ok(stored.to_value())
}

const MODEL_PROGRESS_EVENT: &str = "runtime-models-install://progress";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/// Build the runtime configuration from bundled resources + app-data paths.
/// Generates a fresh bearer token per app session.
pub fn build_config(app: &tauri::AppHandle) -> Result<RuntimeConfiguration, AppError> {
    let resource_dir = app.path().resource_dir()?;
    let app_dir = app.path().app_data_dir()?;

    let py_base = python_base(&resource_dir);
    let python_exe = python_exe_path(&py_base);
    let app_entry = resolve_app_entry(&resource_dir);

    let models_dir = app_dir.join("models");
    let log_dir = app_dir.join("runtime").join("logs");
    let token = Uuid::new_v4().to_string();

    let mut cfg = RuntimeConfiguration::new(python_exe, app_entry, models_dir, log_dir, token);
    cfg.python_home = Some(py_base);

    // Optional, on-demand GPU (CUDA) wheel — activated on next start if present.
    let cuda_dir = app_dir.join("runtime").join("cuda");
    if cuda_dir.exists() {
        cfg.extra_pythonpath.push(cuda_dir.clone());
        cfg.extra_path.push(cuda_dir);
    }
    Ok(cfg)
}

fn first_existing(candidates: &[PathBuf]) -> Option<PathBuf> {
    candidates.iter().find(|p| p.exists()).cloned()
}

fn python_base(resource_dir: &Path) -> PathBuf {
    let bases = [
        resource_dir.join("resources").join("python"),
        resource_dir.join("python"),
    ];
    first_existing(&bases).unwrap_or_else(|| bases[0].clone())
}

fn python_exe_path(base: &Path) -> PathBuf {
    #[cfg(windows)]
    {
        base.join("python.exe")
    }
    #[cfg(not(windows))]
    {
        let cands = [base.join("bin").join("python3"), base.join("bin").join("python")];
        first_existing(&cands).unwrap_or_else(|| cands[0].clone())
    }
}

fn resolve_app_entry(resource_dir: &Path) -> PathBuf {
    let cands = [
        resource_dir.join("resources").join("runtime").join("app.py"),
        resource_dir.join("runtime").join("app.py"),
    ];
    first_existing(&cands).unwrap_or_else(|| cands[0].clone())
}

// ---------------------------------------------------------------------------
// Model catalog (Model Manager)
// ---------------------------------------------------------------------------

pub struct CatalogEntry {
    pub id: &'static str,
    pub name: &'static str,
    pub family: &'static str,
    pub version: &'static str,
    pub size: i64,
    pub url: &'static str,
    /// Lowercase hex SHA-256; empty string skips verification.
    pub sha256: &'static str,
    pub capabilities: &'static [&'static str],
}

/// Downloadable runtime models. Weights are fetched on demand into app-data;
/// nothing here is bundled. URLs/checksums are placeholders to be filled with
/// the official release assets.
pub static RUNTIME_MODEL_CATALOG: &[CatalogEntry] = &[
    CatalogEntry {
        id: "rtdetr-l",
        name: "RT-DETR (large)",
        family: "rtdetr",
        version: "1.0",
        size: 0,
        url: "",
        sha256: "",
        capabilities: &["detection"],
    },
    CatalogEntry {
        id: "sam2-base",
        name: "SAM2 (base)",
        family: "sam2",
        version: "1.0",
        size: 0,
        url: "",
        sha256: "",
        capabilities: &["segmentation"],
    },
    CatalogEntry {
        id: "florence2-base",
        name: "Florence-2 (base)",
        family: "florence2",
        version: "1.0",
        size: 0,
        url: "",
        sha256: "",
        capabilities: &["caption", "ocr", "detection"],
    },
    CatalogEntry {
        id: "paddleocr",
        name: "PaddleOCR",
        family: "paddleocr",
        version: "1.0",
        size: 0,
        url: "",
        sha256: "",
        capabilities: &["ocr"],
    },
    CatalogEntry {
        id: "qwen-vl",
        name: "Qwen-VL",
        family: "qwen",
        version: "1.0",
        size: 0,
        url: "",
        sha256: "",
        capabilities: &["caption"],
    },
];

fn catalog_entry_json(e: &CatalogEntry, status: &str) -> Value {
    json!({
        "id": e.id,
        "name": e.name,
        "family": e.family,
        "version": e.version,
        "size": e.size,
        "downloadUrl": e.url,
        "status": status,
        "capabilities": e.capabilities,
    })
}

/// Merge installed `runtime_models` rows over the static catalog so the UI sees
/// every model with its current status.
pub fn list_models(store: &Arc<dyn RuntimeModelRepository>) -> Result<Vec<Value>, AppError> {
    let rows: Vec<Value> = store.list()?.iter().map(|m| m.to_value()).collect();
    let mut by_id: HashMap<String, Value> = rows
        .into_iter()
        .filter_map(|v| {
            v.get("id")
                .and_then(Value::as_str)
                .map(|id| (id.to_string(), v.clone()))
        })
        .collect();

    let mut out = Vec::new();
    for entry in RUNTIME_MODEL_CATALOG {
        match by_id.remove(entry.id) {
            Some(row) => out.push(row),
            None => out.push(catalog_entry_json(entry, "available")),
        }
    }
    // Installed models that aren't in the catalog (e.g. exported artifacts).
    out.extend(by_id.into_values());
    Ok(out)
}

/// Delete a runtime model: remove its downloaded weight file (best-effort) and
/// its `runtime_models` row. The caller emits the `runtime_model:deleted` event.
pub fn delete_runtime_model(
    repo: &Arc<dyn RuntimeModelRepository>,
    id: &str,
) -> Result<(), AppError> {
    if let Some(model) = repo.get(id)? {
        let v = model.to_value();
        if let Some(p) = v
            .get("localPath")
            .or_else(|| v.get("local_path"))
            .and_then(Value::as_str)
        {
            let _ = std::fs::remove_file(p);
        }
    }
    repo.delete(id)?;
    Ok(())
}

/// Download + verify a catalog model, persisting its `runtime_models` row.
/// Runs on a blocking thread (called via `spawn_blocking`).
pub fn install_runtime_model(
    app: &tauri::AppHandle,
    store: Arc<dyn RuntimeModelRepository>,
    id: &str,
) -> Result<Value, AppError> {
    let entry = RUNTIME_MODEL_CATALOG
        .iter()
        .find(|e| e.id == id)
        .ok_or_else(|| AppError::Message(format!("Unknown runtime model: {id}")))?;

    if entry.url.is_empty() {
        return Err(AppError::Message(format!(
            "No download URL configured for model '{}'.",
            entry.id
        )));
    }

    let app_dir = app.path().app_data_dir()?;
    let dest_dir = app_dir.join("models").join(entry.family);
    std::fs::create_dir_all(&dest_dir)?;
    let filename = entry.url.rsplit('/').next().unwrap_or("model.bin");
    let dest = dest_dir.join(filename);

    // Mark as downloading.
    let _ = upsert_runtime_model(
        &store,
        json!({
            "id": entry.id,
            "name": entry.name,
            "family": entry.family,
            "version": entry.version,
            "downloadUrl": entry.url,
            "size": entry.size,
            "capabilities": entry.capabilities,
            "status": "downloading",
        }),
    );
    emit_progress(app, "start", &format!("Downloading {}", entry.name), 0, entry.size as u64);

    if let Err(e) = download_with_progress(app, entry.url, &dest, entry.sha256) {
        let _ = upsert_runtime_model(
            &store,
            json!({ "id": entry.id, "status": "error" }),
        );
        emit_progress(app, "error", &e.to_string(), 0, 0);
        return Err(e);
    }

    let size = std::fs::metadata(&dest).map(|m| m.len() as i64).unwrap_or(entry.size);
    let saved = upsert_runtime_model(
        &store,
        json!({
            "id": entry.id,
            "name": entry.name,
            "family": entry.family,
            "version": entry.version,
            "downloadUrl": entry.url,
            "size": size,
            "capabilities": entry.capabilities,
            "localPath": dest.to_string_lossy(),
            "status": "installed",
            "installedAt": now_iso(),
        }),
    )?;
    emit_progress(app, "done", "Installed", size as u64, size as u64);
    Ok(saved)
}

fn download_with_progress(
    app: &tauri::AppHandle,
    url: &str,
    dest: &Path,
    expected_sha: &str,
) -> Result<(), AppError> {
    let client = reqwest::blocking::Client::builder()
        .connect_timeout(Duration::from_secs(20))
        .build()?;
    let mut resp = client.get(url).send()?;
    if !resp.status().is_success() {
        return Err(AppError::Message(format!(
            "Download failed: HTTP {}",
            resp.status()
        )));
    }
    let total = resp.content_length().unwrap_or(0);

    let mut file = std::fs::File::create(dest)?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 131_072];
    let mut received: u64 = 0;
    let mut last_emit = Instant::now();

    loop {
        let n = resp.read(&mut buf)?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n])?;
        if !expected_sha.is_empty() {
            hasher.update(&buf[..n]);
        }
        received += n as u64;
        if last_emit.elapsed() >= Duration::from_millis(250) {
            emit_progress(app, "downloading", "Downloading…", received, total);
            last_emit = Instant::now();
        }
    }
    file.flush()?;

    if !expected_sha.is_empty() {
        let digest = hasher.finalize();
        let hex: String = digest.iter().map(|b| format!("{b:02x}")).collect();
        if !hex.eq_ignore_ascii_case(expected_sha) {
            let _ = std::fs::remove_file(dest);
            return Err(AppError::Message(
                "Checksum mismatch — download discarded.".into(),
            ));
        }
    }
    Ok(())
}

fn emit_progress(app: &tauri::AppHandle, phase: &str, message: &str, received: u64, total: u64) {
    let _ = app.emit(
        MODEL_PROGRESS_EVENT,
        json!({
            "phase": phase,
            "message": message,
            "receivedBytes": received,
            "totalBytes": total,
        }),
    );
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

/// On a runtime crash, mark any in-flight training runs as failed — their
/// in-memory torch state can't resume. Called from the monitor's event callback.
/// Delegates to the training module, which transitions the runs and emits an
/// `updated` event per changed run.
pub fn reconcile_jobs_on_crash(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<crate::AppState>() {
        let _ = state.training_service.reconcile_in_flight_failed();
    }
}
