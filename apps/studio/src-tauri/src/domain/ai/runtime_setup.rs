//! On-demand provisioning of the ONNX Runtime native library (and cuDNN).
//!
//! The `ort` crate is built with `load-dynamic`, so a matching `onnxruntime.dll`
//! has to exist on disk at runtime (see docs/ONNXRUNTIME_GPU_SETUP.md). Instead
//! of making the user download Microsoft's GPU package and cuDNN by hand, this
//! module downloads them on demand into `<app data>/onnxruntime/` — the same
//! directory the startup resolver pins `ORT_DYLIB_PATH` to. Because ONNX Runtime
//! is loaded lazily on first use and the load result is cached for the process,
//! the freshly downloaded library only takes effect after the app restarts.
//!
//! Notes:
//! - The GPU package's `onnxruntime.dll` also runs on CPU, so detection works
//!   immediately even when CUDA/cuDNN aren't usable — the CUDA provider just
//!   stays dormant and inference falls back to CPU.
//! - cuDNN is best-effort: a failure to fetch it is non-fatal (CPU fallback).
//! - Windows-only for now; the URLs/DLL names here are Windows x64 specific.

use crate::AppError;
use serde_json::{json, Value};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};

/// ONNX Runtime version to fetch. Must match the `ort` crate's ABI (`api-24` ==
/// ONNX Runtime 1.22). Bump this together with the `ort` dependency in Cargo.toml.
const ORT_VERSION: &str = "1.22.0";
/// Microsoft's Windows x64 GPU build (CUDA + TensorRT providers).
const ORT_GPU_URL: &str = "https://github.com/microsoft/onnxruntime/releases/download/v1.22.0/onnxruntime-win-x64-gpu-1.22.0.zip";
/// Microsoft's Windows x64 CPU build (smaller; used when GPU isn't requested).
const ORT_CPU_URL: &str =
    "https://github.com/microsoft/onnxruntime/releases/download/v1.22.0/onnxruntime-win-x64-1.22.0.zip";
/// cuDNN 9 for CUDA 12 — required for the ONNX Runtime CUDA provider to activate.
/// Public NVIDIA redistributable (no login required).
const CUDNN_URL: &str = "https://developer.download.nvidia.com/compute/cudnn/redist/cudnn/windows-x86_64/cudnn-windows-x86_64-9.8.0.87_cuda12-archive.zip";

/// Event channel the frontend listens on for download/extract progress.
const PROGRESS_EVENT: &str = "ai-runtime-install://progress";

const DLL_NAME: &str = "onnxruntime.dll";

/// Directory the startup resolver pins `ORT_DYLIB_PATH` to (see
/// `resolve_bundled_ort` in lib.rs).
pub fn install_dir(app: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    Ok(app.path().app_data_dir()?.join("onnxruntime"))
}

/// Snapshot of what's already on disk, for the UI to decide whether to offer
/// the install action.
pub fn status(app: &tauri::AppHandle) -> Value {
    let dir = install_dir(app).ok();
    let dll = dir.as_ref().map(|d| d.join(DLL_NAME));
    let installed = dll.as_ref().map(|p| p.exists()).unwrap_or(false);
    let cudnn_installed = dir
        .as_ref()
        .map(|d| d.join("cudnn64_9.dll").exists())
        .unwrap_or(false);
    let cuda_provider_installed = dir
        .as_ref()
        .map(|d| d.join("onnxruntime_providers_cuda.dll").exists())
        .unwrap_or(false);

    json!({
        "installed": installed,
        "cudnnInstalled": cudnn_installed,
        "cudaProviderInstalled": cuda_provider_installed,
        "dllPath": dll.map(|p| p.to_string_lossy().to_string()),
        "installDir": dir.map(|p| p.to_string_lossy().to_string()),
        "version": ORT_VERSION,
        "supported": cfg!(target_os = "windows"),
    })
}

fn emit_progress(
    app: &tauri::AppHandle,
    phase: &str,
    message: &str,
    received: u64,
    total: Option<u64>,
) {
    let _ = app.emit(
        PROGRESS_EVENT,
        json!({
            "phase": phase,
            "message": message,
            "receivedBytes": received,
            "totalBytes": total,
        }),
    );
}

fn http_client() -> Result<reqwest::blocking::Client, AppError> {
    Ok(reqwest::blocking::Client::builder()
        .user_agent(format!("VailabelStudio/{}", env!("CARGO_PKG_VERSION")))
        .connect_timeout(Duration::from_secs(20))
        // No overall timeout — these packages are hundreds of MB.
        .build()?)
}

/// Stream `url` to `dest`, emitting throttled progress events while it downloads.
fn download_with_progress(
    app: &tauri::AppHandle,
    client: &reqwest::blocking::Client,
    url: &str,
    dest: &Path,
    phase: &str,
    label: &str,
) -> Result<(), AppError> {
    let mut response = client.get(url).send()?.error_for_status()?;
    let total = response.content_length();
    let mut file = fs::File::create(dest)?;
    let mut buffer = [0u8; 128 * 1024];
    let mut downloaded: u64 = 0;
    let mut last_emit = Instant::now();
    emit_progress(app, phase, &format!("Downloading {label}…"), 0, total);
    loop {
        let read = response.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        file.write_all(&buffer[..read])?;
        downloaded += read as u64;
        // Throttle so we don't flood the event bus on fast connections.
        if last_emit.elapsed() >= Duration::from_millis(250) {
            emit_progress(app, phase, &format!("Downloading {label}…"), downloaded, total);
            last_emit = Instant::now();
        }
    }
    file.flush()?;
    emit_progress(app, phase, &format!("Downloaded {label}"), downloaded, total);
    Ok(())
}

/// Extract every `*.dll` that lives under `<subdir>/` in `zip_path` into `dest`,
/// flattening the directory structure. Returns how many were written.
fn extract_dlls(
    app: &tauri::AppHandle,
    zip_path: &Path,
    dest: &Path,
    subdir: &str,
    phase: &str,
) -> Result<usize, AppError> {
    let file = fs::File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|error| AppError::Message(format!("Could not open archive: {error}")))?;
    let subdir = subdir.trim_matches('/');
    let nested = format!("/{subdir}/");
    let prefixed = format!("{subdir}/");
    let mut count = 0usize;

    for index in 0..archive.len() {
        let mut entry = archive
            .by_index(index)
            .map_err(|error| AppError::Message(format!("Could not read archive entry: {error}")))?;
        // Own the name so the immutable borrow is released before we copy bytes
        // out of `entry` (which needs a mutable borrow).
        let normalized = entry.name().replace('\\', "/");
        let is_dll = normalized.to_ascii_lowercase().ends_with(".dll");
        let in_subdir = normalized.contains(&nested) || normalized.starts_with(&prefixed);
        if !is_dll || !in_subdir {
            continue;
        }
        let Some(file_name) = normalized.rsplit('/').next().filter(|name| !name.is_empty()) else {
            continue;
        };
        let out_path = dest.join(file_name);
        let mut out = fs::File::create(&out_path)?;
        std::io::copy(&mut entry, &mut out)?;
        count += 1;
        emit_progress(app, phase, &format!("Extracting {file_name}"), count as u64, None);
    }

    Ok(count)
}

/// Download + unpack only the pieces that aren't already on disk. If everything
/// required for the requested mode is present, nothing is downloaded — the
/// caller just needs to restart so ONNX Runtime loads it. Returns a status
/// object describing what landed, what was skipped, and any non-fatal warnings.
pub fn ensure_runtime(app: &tauri::AppHandle, gpu: bool) -> Result<Value, AppError> {
    if !cfg!(target_os = "windows") {
        return Err(AppError::Message(
            "Automatic ONNX Runtime setup is currently Windows-only. See \
             docs/ONNXRUNTIME_GPU_SETUP.md for manual setup on this platform."
                .into(),
        ));
    }

    let dir = install_dir(app)?;
    fs::create_dir_all(&dir)?;

    let ort_dll = dir.join(DLL_NAME);
    let cuda_provider = dir.join("onnxruntime_providers_cuda.dll");
    let cudnn_dll = dir.join("cudnn64_9.dll");

    // Only fetch what's missing. A GPU request needs the GPU `onnxruntime.dll`
    // (which ships the CUDA provider alongside it); CPU needs just the dll.
    let ort_present = ort_dll.exists() && (!gpu || cuda_provider.exists());
    let cudnn_present = cudnn_dll.exists();
    let need_ort = !ort_present;
    let need_cudnn = gpu && !cudnn_present;

    let mut installed: Vec<&str> = Vec::new();
    let mut skipped: Vec<&str> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();

    if need_ort || need_cudnn {
        let staging = dir.join(".download");
        fs::create_dir_all(&staging)?;
        let client = http_client()?;

        // 1) ONNX Runtime itself (required, but only if not already present).
        if need_ort {
            let (ort_url, ort_label) = if gpu {
                (ORT_GPU_URL, "ONNX Runtime (GPU)")
            } else {
                (ORT_CPU_URL, "ONNX Runtime (CPU)")
            };
            let ort_zip = staging.join("onnxruntime.zip");
            download_with_progress(app, &client, ort_url, &ort_zip, "onnxruntime", ort_label)?;
            emit_progress(app, "extract", "Extracting ONNX Runtime…", 0, None);
            let extracted = extract_dlls(app, &ort_zip, &dir, "lib", "extract")?;
            let _ = fs::remove_file(&ort_zip);
            if extracted == 0 {
                let _ = fs::remove_dir_all(&staging);
                return Err(AppError::Message(
                    "No ONNX Runtime libraries were found in the downloaded package.".into(),
                ));
            }
            installed.push("onnxruntime");
        } else {
            skipped.push("onnxruntime");
        }

        // 2) cuDNN 9 (best-effort) — needed for the CUDA provider to activate.
        //    A failure here is non-fatal: detection still runs on CPU.
        if gpu {
            if need_cudnn {
                let cudnn_zip = staging.join("cudnn.zip");
                let cudnn_result = download_with_progress(
                    app,
                    &client,
                    CUDNN_URL,
                    &cudnn_zip,
                    "cudnn",
                    "cuDNN 9 (CUDA acceleration)",
                )
                .and_then(|()| {
                    emit_progress(app, "extract", "Extracting cuDNN…", 0, None);
                    extract_dlls(app, &cudnn_zip, &dir, "bin", "extract")
                });
                let _ = fs::remove_file(&cudnn_zip);
                match cudnn_result {
                    Ok(n) if n > 0 => installed.push("cudnn"),
                    Ok(_) => warnings.push(
                        "cuDNN package contained no libraries; CUDA acceleration is unavailable \
                         so detection will run on CPU."
                            .into(),
                    ),
                    Err(error) => warnings.push(format!(
                        "cuDNN download failed — CUDA acceleration is unavailable so detection \
                         will run on CPU. ({error})"
                    )),
                }
            } else {
                skipped.push("cudnn");
            }
        }

        let _ = fs::remove_dir_all(&staging);
    } else {
        // Already complete for the requested mode — record what we skipped.
        skipped.push("onnxruntime");
        if gpu {
            skipped.push("cudnn");
        }
    }

    let cudnn_installed = cudnn_dll.exists();
    let already_present = installed.is_empty();
    let message = if already_present {
        "ONNX Runtime is already installed. Restart to activate."
    } else {
        "ONNX Runtime is ready. Restart to activate."
    };
    emit_progress(app, "done", message, 0, None);

    Ok(json!({
        "installed": ort_dll.exists(),
        "alreadyPresent": already_present,
        "gpuRequested": gpu,
        "cudnnInstalled": cudnn_installed,
        "installedComponents": installed,
        "skippedComponents": skipped,
        "dllPath": ort_dll.to_string_lossy().to_string(),
        "installDir": dir.to_string_lossy().to_string(),
        "version": ORT_VERSION,
        "warnings": warnings,
        // Restart only matters if a runtime is actually on disk to load.
        "restartRequired": ort_dll.exists(),
    }))
}
