//! Hardware / runtime capability detection for the local AI assistant.
//!
//! Phase 1: report which ONNX Runtime execution providers are compiled into this
//! build plus basic host info, so the UI can tell the user whether GPU
//! acceleration is available and which backend inference will use. We
//! deliberately report *compiled-in capability* rather than probing/inventing
//! GPU specs — the CUDA provider is attempted at session creation and silently
//! falls back to CPU when no compatible device is present (see `inference.rs`).

use serde_json::{json, Value};

/// ONNX Runtime (`ort`) is compiled into this build.
const ONNX_ENABLED: bool = cfg!(feature = "yolo-inference");

/// The CUDA execution provider is compiled in (the `ort` "cuda" feature ships
/// together with the `yolo-inference` feature).
const CUDA_COMPILED: bool = cfg!(feature = "yolo-inference");

/// Snapshot of the local inference runtime capabilities, serialized to the
/// frontend by the `ai_gpu_info` command.
pub fn gpu_info() -> Value {
    let logical_cores = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(0);

    let mut providers: Vec<Value> = Vec::new();

    if CUDA_COMPILED {
        providers.push(json!({
            "name": "CUDA",
            "kind": "gpu",
            "compiledIn": true,
            "note": "Used automatically when an NVIDIA GPU + CUDA 12 runtime is present; falls back to CPU otherwise.",
        }));
    }

    providers.push(json!({
        "name": "CPU",
        "kind": "cpu",
        "compiledIn": ONNX_ENABLED,
        "note": "Always available when ONNX Runtime is enabled.",
    }));

    let recommended = if CUDA_COMPILED {
        "CUDA"
    } else if ONNX_ENABLED {
        "CPU"
    } else {
        "none"
    };

    json!({
        "onnxRuntime": ONNX_ENABLED,
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "logicalCores": logical_cores,
        "executionProviders": providers,
        "recommendedProvider": recommended,
        // GPU acceleration is resolved at session init (CUDA attempted first,
        // CPU fallback). Compiled-in here means "can attempt GPU".
        "gpuAccelerationAvailable": CUDA_COMPILED,
    })
}
