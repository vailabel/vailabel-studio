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

/// Actually probe the runtime: does ONNX Runtime load, and is the CUDA provider
/// usable on this host? Returns `(onnx_loaded, cuda_available, load_error)`.
/// This is the difference between "compiled in" and "actually works".
#[cfg(feature = "yolo-inference")]
fn runtime_probe() -> (bool, bool, Option<String>) {
    use ort::execution_providers::{CUDAExecutionProvider, ExecutionProvider};

    // `commit()` returns whether the ONNX Runtime dynamic library loaded.
    if !ort::init().commit() {
        return (
            false,
            false,
            Some(
                "ONNX Runtime did not load. Set ORT_DYLIB_PATH to a compatible onnxruntime.dll \
                 (the Windows System32 copy is CPU-only and often a version mismatch)."
                    .to_string(),
            ),
        );
    }

    let cuda = CUDAExecutionProvider::default()
        .is_available()
        .unwrap_or(false);
    (true, cuda, None)
}

#[cfg(not(feature = "yolo-inference"))]
fn runtime_probe() -> (bool, bool, Option<String>) {
    (false, false, None)
}

/// Snapshot of the local inference runtime capabilities, serialized to the
/// frontend by the `ai_gpu_info` command.
pub fn gpu_info() -> Value {
    let logical_cores = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(0);

    let (onnx_loaded, cuda_available, load_error) = runtime_probe();

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

    let recommended = if cuda_available {
        "CUDA"
    } else if onnx_loaded {
        "CPU"
    } else {
        "none"
    };

    json!({
        // Compile-time: the ort crate + CUDA provider are built into this binary.
        "onnxRuntime": ONNX_ENABLED,
        "cudaCompiled": CUDA_COMPILED,
        // Runtime: what actually loaded on this machine right now.
        "onnxRuntimeLoaded": onnx_loaded,
        "cudaAvailable": cuda_available,
        "loadError": load_error,
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "logicalCores": logical_cores,
        "executionProviders": providers,
        "recommendedProvider": recommended,
        // True only when CUDA is both compiled in AND usable on this host.
        "gpuAccelerationAvailable": CUDA_COMPILED && cuda_available,
    })
}
