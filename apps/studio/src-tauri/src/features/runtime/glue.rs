//! Tauri-facing glue for the embedded AI runtime: resolves bundled resource
//! paths into a [`RuntimeConfiguration`], holds the downloadable-model catalog,
//! and streams weight downloads into app-data (reusing the same progress-event
//! style as `domain/ai/runtime_setup.rs`).

use std::collections::HashMap;
use std::io::{BufRead, Read, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
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

    let py_base = python_base(&resource_dir, &app_dir);
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

/// The directory that holds (or will hold) the embedded interpreter, resolved in
/// priority order:
///   1. `VAILABEL_PYTHON_HOME` — an explicit override (dev / testing).
///   2. `<app_data>/runtime/python` — the runtime-provisioned location, downloaded
///      on first run by [`install_runtime`]. This is the production path now that
///      the interpreter is no longer bundled in the installer.
///   3. A bundled `resources/python` under the resource dir — back-compat for
///      builds that still ship the interpreter; harmless when absent.
///
/// When none exist yet, defaults to the app-data path so the (immutable)
/// `RuntimeConfiguration` already points where provisioning will install — no
/// rebuild is needed once the download completes.
fn python_base(resource_dir: &Path, app_dir: &Path) -> PathBuf {
    if let Some(env_home) = std::env::var_os("VAILABEL_PYTHON_HOME") {
        let p = PathBuf::from(env_home);
        if python_exe_path(&p).exists() {
            return p;
        }
    }
    let provisioned = runtime_python_dir_from(app_dir);
    if python_exe_path(&provisioned).exists() {
        return provisioned;
    }
    let bundled = [
        resource_dir.join("resources").join("python"),
        resource_dir.join("python"),
    ];
    if let Some(b) = bundled.iter().find(|p| python_exe_path(p).exists()) {
        return b.clone();
    }
    // Nothing on disk yet — point at where provisioning will install.
    provisioned
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

fn resolve_requirements(resource_dir: &Path) -> PathBuf {
    let cands = [
        resource_dir.join("resources").join("runtime").join("requirements.txt"),
        resource_dir.join("runtime").join("requirements.txt"),
    ];
    first_existing(&cands).unwrap_or_else(|| cands[0].clone())
}

// ---------------------------------------------------------------------------
// First-run provisioning
//
// The embedded interpreter is ~1.5 GB (torch et al.) and is NOT bundled in the
// installer. On first AI use we download a standalone CPython into app-data and
// pip-install the runtime requirements into it — the same two steps as
// `scripts/build-runtime.{sh,ps1}`, run at runtime with progress events. This
// mirrors the on-demand model-weight / CUDA-overlay downloads and sidesteps the
// macOS cross-arch build problem (provisioning runs on the user's real arch).
// ---------------------------------------------------------------------------

const RUNTIME_INSTALL_EVENT: &str = "runtime-install://progress";
/// CPython version + python-build-standalone release tag. Keep in sync with
/// `scripts/build-runtime.{sh,ps1}`.
const PY_VERSION: &str = "3.11.9";
const PBS_RELEASE: &str = "20240814";

/// Coarse all-platforms download+install estimate, shown in the install prompt.
const RUNTIME_SIZE_ESTIMATE_MB: i64 = 1500;

/// Serializes installs so a second trigger (e.g. eager start racing a manual
/// click) can't run two downloads into the same tree.
static INSTALL_IN_FLIGHT: std::sync::atomic::AtomicBool =
    std::sync::atomic::AtomicBool::new(false);

fn runtime_python_dir_from(app_dir: &Path) -> PathBuf {
    app_dir.join("runtime").join("python")
}

/// `<app_data>/runtime/python` — where the provisioned interpreter lives.
pub fn runtime_python_dir(app: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    Ok(runtime_python_dir_from(&app.path().app_data_dir()?))
}

/// Sentinel written only after pip succeeds, so a half-finished install (e.g.
/// interpreter extracted but pip interrupted) is not mistaken for "installed".
fn ready_marker(python_dir: &Path) -> PathBuf {
    python_dir.join(".vailabel-ready")
}

/// True once the runtime can actually start: a bundled / `VAILABEL_PYTHON_HOME`
/// interpreter is trusted as-is, while the provisioned app-data location also
/// requires the post-pip ready marker.
pub fn is_runtime_installed(app: &tauri::AppHandle) -> bool {
    let (Ok(resource_dir), Ok(app_dir)) =
        (app.path().resource_dir(), app.path().app_data_dir())
    else {
        return false;
    };
    let base = python_base(&resource_dir, &app_dir);
    if base == runtime_python_dir_from(&app_dir) {
        ready_marker(&base).exists()
    } else {
        python_exe_path(&base).exists()
    }
}

/// Status payload for the `runtime_install_status` command.
pub fn install_status(app: &tauri::AppHandle) -> Value {
    json!({
        "installed": is_runtime_installed(app),
        "sizeEstimateMb": RUNTIME_SIZE_ESTIMATE_MB,
        "pythonDir": runtime_python_dir(app)
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_default(),
    })
}

/// The python-build-standalone asset triple for the host platform.
fn pbs_asset_triple() -> Result<&'static str, AppError> {
    Ok(match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", "x86_64") => "x86_64-pc-windows-msvc",
        ("macos", "aarch64") => "aarch64-apple-darwin",
        ("macos", "x86_64") => "x86_64-apple-darwin",
        ("linux", "x86_64") => "x86_64-unknown-linux-gnu",
        ("linux", "aarch64") => "aarch64-unknown-linux-gnu",
        (os, arch) => {
            return Err(AppError::Message(format!(
                "No prebuilt Python runtime is available for this platform ({os}/{arch})."
            )))
        }
    })
}

/// Download a standalone CPython into `<app_data>/runtime/python` and pip-install
/// the bundled `requirements.txt` into it. Idempotent (no-op once installed) and
/// re-entrancy guarded. Long-running → call on a blocking thread. Streams
/// `runtime-install://progress`; emits a final `error` phase on failure.
pub fn install_runtime(app: &tauri::AppHandle) -> Result<Value, AppError> {
    if is_runtime_installed(app) {
        return Ok(json!({ "installed": true }));
    }
    if INSTALL_IN_FLIGHT.swap(true, std::sync::atomic::Ordering::SeqCst) {
        return Err(AppError::Message(
            "An AI runtime install is already in progress.".into(),
        ));
    }
    let result = install_runtime_inner(app);
    INSTALL_IN_FLIGHT.store(false, std::sync::atomic::Ordering::SeqCst);
    if let Err(e) = &result {
        emit_install(app, "error", &e.to_string(), 0, 0);
    }
    result
}

fn install_runtime_inner(app: &tauri::AppHandle) -> Result<Value, AppError> {
    let resource_dir = app.path().resource_dir()?;
    let app_dir = app.path().app_data_dir()?;
    let python_dir = runtime_python_dir_from(&app_dir);
    std::fs::create_dir_all(&python_dir)?;

    emit_install(app, "start", "Preparing the AI runtime…", 0, 0);

    // 1. Standalone CPython (skip if a prior run already extracted it).
    if !python_exe_path(&python_dir).exists() {
        let triple = pbs_asset_triple()?;
        let asset = format!("cpython-{PY_VERSION}+{PBS_RELEASE}-{triple}-install_only.tar.gz");
        let url = format!(
            "https://github.com/indygreg/python-build-standalone/releases/download/{PBS_RELEASE}/{asset}"
        );
        let archive = app_dir.join("runtime").join("cpython-download.tar.gz");
        emit_install(app, "downloading", "Downloading Python runtime…", 0, 0);
        download_to(app, &url, &archive)?;
        emit_install(app, "extracting", "Unpacking Python runtime…", 0, 0);
        extract_tar_gz(&archive, &python_dir)?;
        let _ = std::fs::remove_file(&archive);
    }

    let py = python_exe_path(&python_dir);
    if !py.exists() {
        return Err(AppError::Message(
            "Python runtime extraction did not produce an interpreter.".into(),
        ));
    }

    // 2. Install the runtime's Python dependencies into the interpreter.
    let requirements = resolve_requirements(&resource_dir);
    let req_str = requirements.to_string_lossy().into_owned();
    emit_install(
        app,
        "installing",
        "Installing AI dependencies — this can take a few minutes…",
        0,
        0,
    );
    run_pip(app, &py, &["--upgrade", "pip"])?;
    run_pip(app, &py, &["-r", req_str.as_str()])?;

    // 3. Mark ready only after pip succeeds.
    std::fs::write(ready_marker(&python_dir), now_iso())?;
    emit_install(app, "done", "AI runtime installed.", 0, 0);
    Ok(json!({ "installed": true }))
}

/// Stream a URL to `dest`, emitting `runtime-install://progress`. No checksum —
/// assets are fetched over TLS from the python-build-standalone GitHub release.
fn download_to(app: &tauri::AppHandle, url: &str, dest: &Path) -> Result<(), AppError> {
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
    let mut buf = [0u8; 131_072];
    let mut received: u64 = 0;
    let mut last_emit = Instant::now();
    loop {
        let n = resp.read(&mut buf)?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n])?;
        received += n as u64;
        if last_emit.elapsed() >= Duration::from_millis(250) {
            emit_install(app, "downloading", "Downloading Python runtime…", received, total);
            last_emit = Instant::now();
        }
    }
    file.flush()?;
    Ok(())
}

/// Extract a `.tar.gz` into `dest`, flattening the archive's top-level folder.
/// Shells out to `tar` (bsdtar on Win10+/macOS, GNU tar on Linux), matching the
/// build-runtime scripts and avoiding extra crate deps.
fn extract_tar_gz(archive: &Path, dest: &Path) -> Result<(), AppError> {
    std::fs::create_dir_all(dest)?;
    let status = Command::new("tar")
        .arg("-xzf")
        .arg(archive)
        .arg("-C")
        .arg(dest)
        .arg("--strip-components=1")
        .status()
        .map_err(|e| AppError::Message(format!("Failed to run tar: {e}")))?;
    if !status.success() {
        return Err(AppError::Message(
            "Failed to extract the Python runtime archive.".into(),
        ));
    }
    Ok(())
}

/// Run `<py> -m pip install <args>`, draining stdout+stderr concurrently (so a
/// full pipe can't deadlock the long install) and streaming each line as
/// `runtime-install://progress`.
fn run_pip(app: &tauri::AppHandle, py: &Path, install_args: &[&str]) -> Result<(), AppError> {
    let mut command = Command::new(py);
    command
        .arg("-m")
        .arg("pip")
        .arg("install")
        .arg("--progress-bar")
        .arg("raw")
        .arg("--no-input")
        .arg("--disable-pip-version-check");
    for a in install_args {
        command.arg(a);
    }
    let mut child = command
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| AppError::Message(format!("Failed to launch pip: {e}")))?;

    let stderr = child.stderr.take();
    let app_err = app.clone();
    let stderr_thread = std::thread::spawn(move || {
        let mut last = Instant::now();
        if let Some(s) = stderr {
            for line in std::io::BufReader::new(s).lines().map_while(Result::ok) {
                handle_install_pip_line(&app_err, &line, &mut last);
            }
        }
    });
    if let Some(s) = child.stdout.take() {
        let mut last = Instant::now();
        for line in std::io::BufReader::new(s).lines().map_while(Result::ok) {
            handle_install_pip_line(app, &line, &mut last);
        }
    }
    let _ = stderr_thread.join();

    let status = child
        .wait()
        .map_err(|e| AppError::Message(format!("pip did not complete: {e}")))?;
    if !status.success() {
        return Err(AppError::Message(format!(
            "pip install failed (exit {:?}). Check your internet connection and try again.",
            status.code()
        )));
    }
    Ok(())
}

fn handle_install_pip_line(app: &tauri::AppHandle, line: &str, last_emit: &mut Instant) {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return;
    }
    if let Some((received, total)) = parse_pip_progress(trimmed) {
        if last_emit.elapsed() >= Duration::from_millis(200) {
            emit_install(app, "installing", "Installing AI dependencies…", received, total);
            *last_emit = Instant::now();
        }
    } else {
        emit_install(app, "installing", trimmed, 0, 0);
    }
}

fn emit_install(app: &tauri::AppHandle, phase: &str, message: &str, received: u64, total: u64) {
    let _ = app.emit(
        RUNTIME_INSTALL_EVENT,
        json!({
            "phase": phase,
            "message": message,
            "receivedBytes": received,
            "totalBytes": total,
        }),
    );
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
    /// What the Python runtime loads for this model — an ultralytics weight name
    /// (e.g. `rtdetr-l.pt`) or a HuggingFace repo id (e.g.
    /// `microsoft/Florence-2-base`). ultralytics / transformers / paddleocr fetch
    /// and cache it on first use, so nothing is downloaded ahead of time. Empty
    /// when the family loads its own bundled default (PaddleOCR).
    pub weight: &'static str,
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
        weight: "rtdetr-l.pt",
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
        weight: "sam2_b.pt",
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
        weight: "microsoft/Florence-2-base",
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
        weight: "",
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
        weight: "Qwen/Qwen2-VL-2B-Instruct",
    },
];

/// The Python-runtime weight ref for a catalog model id — an ultralytics weight
/// name or a HuggingFace repo id, fetched on first use. `None` when the id isn't
/// a runtime-catalog model (or the family loads its own bundled default), so the
/// caller falls back to an on-disk `ai_models` path.
pub fn runtime_model_weight(id: &str) -> Option<&'static str> {
    RUNTIME_MODEL_CATALOG
        .iter()
        .find(|entry| entry.id == id)
        .map(|entry| entry.weight)
        .filter(|weight| !weight.is_empty())
}

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

// ---------------------------------------------------------------------------
// GPU (CUDA) acceleration: detect the NVIDIA GPU and provision a CUDA build of
// PyTorch into the overlay so it "just works" once the user has an NVIDIA driver.
// ---------------------------------------------------------------------------

const GPU_PROGRESS_EVENT: &str = "runtime-gpu-install://progress";

/// Probe for an NVIDIA GPU + driver via `nvidia-smi`, independent of whether the
/// runtime's torch is a CUDA build (CPU-only torch reports no GPU even when one
/// is present). Lets the UI tell the user a GPU is available and pick the right
/// CUDA wheel. Never errors — returns `{ detected: false }` when nvidia-smi is
/// absent or fails.
pub fn gpu_probe(app: &tauri::AppHandle) -> Value {
    let overlay_installed = app
        .path()
        .app_data_dir()
        .ok()
        .map(|d| d.join("runtime").join("cuda").join("torch").exists())
        .unwrap_or(false);

    let probe = Command::new("nvidia-smi")
        .args([
            "--query-gpu=name,driver_version",
            "--format=csv,noheader,nounits",
        ])
        .output();

    let Ok(out) = probe else {
        return json!({ "detected": false, "overlayInstalled": overlay_installed, "platform": std::env::consts::OS });
    };
    if !out.status.success() {
        return json!({ "detected": false, "overlayInstalled": overlay_installed, "platform": std::env::consts::OS });
    }
    let stdout = String::from_utf8_lossy(&out.stdout);
    let first = stdout.lines().next().unwrap_or("").trim();
    if first.is_empty() {
        return json!({ "detected": false, "overlayInstalled": overlay_installed, "platform": std::env::consts::OS });
    }
    let mut parts = first.split(',').map(str::trim);
    let name = parts.next().unwrap_or("").to_string();
    let driver = parts.next().unwrap_or("").to_string();

    let cuda_version = Command::new("nvidia-smi")
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| parse_cuda_version(&String::from_utf8_lossy(&o.stdout)));
    let tag = cuda_wheel_tag(cuda_version.as_deref());

    json!({
        "detected": true,
        "name": name,
        "driverVersion": driver,
        "cudaVersion": cuda_version,
        "recommendedTag": tag,
        "overlayInstalled": overlay_installed,
        "platform": std::env::consts::OS,
    })
}

/// The driver's max CUDA version, parsed from the header of plain `nvidia-smi`
/// (e.g. "… CUDA Version: 12.8 …").
fn parse_cuda_version(text: &str) -> Option<String> {
    let idx = text.find("CUDA Version:")?;
    let rest = text[idx + "CUDA Version:".len()..].trim_start();
    let token: String = rest
        .chars()
        .take_while(|c| c.is_ascii_digit() || *c == '.')
        .collect();
    (!token.is_empty()).then_some(token)
}

fn parse_major_minor(v: &str) -> Option<(u32, u32)> {
    let mut it = v.split('.');
    let maj = it.next()?.parse().ok()?;
    let min = it.next().unwrap_or("0").parse().ok()?;
    Some((maj, min))
}

/// Map the driver's max CUDA version to a PyTorch wheel channel. Defaults to the
/// newest (cu128) — required by the latest GPUs (RTX 50-series / sm_120).
fn cuda_wheel_tag(cuda_version: Option<&str>) -> &'static str {
    match cuda_version.and_then(parse_major_minor) {
        Some((maj, min)) if maj > 12 || (maj == 12 && min >= 8) => "cu128",
        Some((12, min)) if min >= 6 => "cu126",
        Some((12, min)) if min >= 4 => "cu124",
        Some((12, _)) => "cu121",
        Some((11, _)) => "cu118",
        _ => "cu128",
    }
}

/// Install a CUDA build of PyTorch into the GPU overlay dir
/// (`<app_data>/runtime/cuda`) using the bundled Python's pip, so the next
/// runtime start uses the GPU. On Windows the torch wheel bundles its own CUDA
/// DLLs, so a torch-only `--no-deps` overlay is enough (its pure-python deps stay
/// satisfied by the bundled site-packages). Streams pip output as
/// `runtime-gpu-install://progress`. Runs on a blocking thread.
pub fn enable_gpu_overlay(app: &tauri::AppHandle, tag: &str) -> Result<Value, AppError> {
    if cfg!(target_os = "macos") {
        return Err(AppError::Message(
            "On macOS, PyTorch uses the Apple GPU (Metal/MPS) automatically — there's no CUDA build to install.".into(),
        ));
    }
    let resource_dir = app.path().resource_dir()?;
    let app_dir = app.path().app_data_dir()?;
    let python_exe = python_exe_path(&python_base(&resource_dir, &app_dir));
    if !python_exe.exists() {
        return Err(AppError::Message(
            "The AI runtime isn't installed yet, so GPU acceleration can't be added. Install it from the AI page first.".into(),
        ));
    }

    let overlay = app_dir.join("runtime").join("cuda");
    std::fs::create_dir_all(&overlay)?;
    let index_url = format!("https://download.pytorch.org/whl/{tag}");

    emit_gpu_progress(
        app,
        "start",
        &format!("Installing CUDA PyTorch ({tag}) — this is a large (~2 GB) download…"),
        0,
        0,
    );

    let mut command = Command::new(&python_exe);
    command
        .arg("-m")
        .arg("pip")
        .arg("install")
        .arg("--progress-bar")
        .arg("raw")
        .arg("--upgrade")
        .arg("--no-cache-dir");
    if cfg!(target_os = "windows") {
        // Windows torch wheels bundle their own CUDA DLLs, so torch alone is enough
        // and its pure-python deps stay satisfied by the bundled site-packages.
        command.arg("--no-deps");
    } else {
        // Linux: the CUDA libraries ship as separate `nvidia-*` packages (deps of
        // torch), so install with deps — torch + CUDA libs from the torch index,
        // any remaining pure-python deps from PyPI.
        command.arg("--extra-index-url").arg("https://pypi.org/simple");
    }
    // Install torch AND torchvision as a matched pair from the same CUDA index.
    // ultralytics (YOLO / RT-DETR) calls `torchvision.ops.nms`, whose compiled op
    // only registers when torchvision's version matches the loaded torch — a
    // torch-only overlay shadows torch but leaves the bundled CPU torchvision,
    // which then fails with "operator torchvision::nms does not exist".
    let mut child = command
        .arg("--target")
        .arg(&overlay)
        .arg("--index-url")
        .arg(&index_url)
        .arg("torch")
        .arg("torchvision")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| AppError::Message(format!("Failed to launch pip: {e}")))?;

    // Drain stdout + stderr concurrently so a full pipe buffer can't deadlock the
    // long download, emitting each non-empty line as progress.
    let stderr = child.stderr.take();
    let app_err = app.clone();
    let stderr_thread = std::thread::spawn(move || {
        let mut last = Instant::now();
        if let Some(s) = stderr {
            for line in std::io::BufReader::new(s).lines().map_while(Result::ok) {
                handle_pip_line(&app_err, &line, &mut last);
            }
        }
    });
    if let Some(s) = child.stdout.take() {
        let mut last = Instant::now();
        for line in std::io::BufReader::new(s).lines().map_while(Result::ok) {
            handle_pip_line(app, &line, &mut last);
        }
    }
    let _ = stderr_thread.join();

    let status = child
        .wait()
        .map_err(|e| AppError::Message(format!("pip did not complete: {e}")))?;
    if !status.success() {
        emit_gpu_progress(app, "error", "GPU install failed — see the runtime log.", 0, 0);
        return Err(AppError::Message(format!(
            "pip install of CUDA PyTorch failed (exit {:?}). Check your connection and that this GPU supports {tag}.",
            status.code()
        )));
    }

    emit_gpu_progress(
        app,
        "done",
        "CUDA PyTorch installed. Restart the app to use your GPU.",
        0,
        0,
    );
    Ok(json!({ "ok": true, "tag": tag }))
}

fn emit_gpu_progress(
    app: &tauri::AppHandle,
    phase: &str,
    message: &str,
    received: u64,
    total: u64,
) {
    let _ = app.emit(
        GPU_PROGRESS_EVENT,
        json!({
            "phase": phase,
            "message": message,
            "receivedBytes": received,
            "totalBytes": total,
        }),
    );
}

/// Parse a pip `--progress-bar raw` line: "Progress <received> of <total>".
fn parse_pip_progress(line: &str) -> Option<(u64, u64)> {
    let (recv, total) = line.trim().strip_prefix("Progress ")?.split_once(" of ")?;
    Some((recv.trim().parse().ok()?, total.trim().parse().ok()?))
}

/// Handle one streamed pip line: throttle byte-progress events to ~5/s, pass real
/// log lines through immediately.
fn handle_pip_line(app: &tauri::AppHandle, line: &str, last_emit: &mut Instant) {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return;
    }
    if let Some((received, total)) = parse_pip_progress(trimmed) {
        if last_emit.elapsed() >= Duration::from_millis(200) {
            emit_gpu_progress(app, "installing", "Downloading CUDA PyTorch…", received, total);
            *last_emit = Instant::now();
        }
    } else {
        emit_gpu_progress(app, "installing", trimmed, 0, 0);
    }
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
