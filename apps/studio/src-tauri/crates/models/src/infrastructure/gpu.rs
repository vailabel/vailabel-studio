//! Hardware / runtime capability detection for the local AI assistant.
//!
//! Reports which ONNX Runtime execution providers are compiled into this build
//! plus basic host info, so the UI can tell the user whether GPU acceleration is
//! available and which backend inference will use. We deliberately report
//! *compiled-in capability* rather than probing/inventing GPU specs — the CUDA
//! provider is attempted at session creation and silently falls back to CPU when
//! no compatible device is present.
//!
//! The `local-inference` feature (enabled by the binary's `yolo-inference`)
//! pulls the `ort` crate; without it `gpu_info` reports a CPU-only/unloaded
//! snapshot.

use serde_json::{json, Value};

/// ONNX Runtime (`ort`) is compiled into this build.
const ONNX_ENABLED: bool = cfg!(feature = "local-inference");

/// The CUDA execution provider is compiled in (the `ort` "cuda" feature ships
/// together with the `local-inference` feature).
const CUDA_COMPILED: bool = cfg!(feature = "local-inference");

/// What the runtime probe found. `build_info` is the **actually-loaded** ONNX
/// Runtime's build string (version/commit/flags) — distinct from the compile-time
/// version this app targets, so a version skew (e.g. a 1.22 dll vs a build that
/// wants 1.23+ enum values) is visible instead of silent.
#[derive(Default)]
struct RuntimeProbe {
    onnx_loaded: bool,
    cuda_available: bool,
    load_error: Option<String>,
    build_info: Option<String>,
}

/// Actually probe the runtime: does ONNX Runtime load, is the CUDA provider usable
/// on this host, and what version actually loaded? This is the difference between
/// "compiled in" and "actually works".
#[cfg(feature = "local-inference")]
fn runtime_probe() -> RuntimeProbe {
    use ort::execution_providers::{CUDAExecutionProvider, ExecutionProvider};

    // IMPORTANT: `commit()` does NOT report whether the dll loaded — it returns
    // `false` if a global environment was *already* configured (the app commits
    // one at startup), which is not a failure. So ignore its result here.
    let _ = ort::init().commit();

    // Querying a provider forces ONNX Runtime's dynamic library to actually load.
    // `ort` *panics* (rather than returning `Err`) when the dll can't be loaded or
    // is an incompatible API version, so guard the call and turn a panic into a
    // clean "not loaded" status instead of taking down the whole probe.
    let probe = std::panic::catch_unwind(|| {
        CUDAExecutionProvider::default()
            .is_available()
            .unwrap_or(false)
    });

    match probe {
        Ok(cuda_available) => {
            // The runtime is loaded now, so reading its build info is safe; still
            // guard it since it dereferences the native API.
            let build_info = std::panic::catch_unwind(|| ort::info().to_string())
                .ok()
                .filter(|info| !info.trim().is_empty());
            RuntimeProbe {
                onnx_loaded: true,
                cuda_available,
                load_error: None,
                build_info,
            }
        }
        Err(_) => {
            // Surface what we actually tried to load so a failure is self-diagnosing.
            let tried = match std::env::var("ORT_DYLIB_PATH") {
                Ok(path) if !path.trim().is_empty() => format!("tried '{path}'"),
                _ => "ORT_DYLIB_PATH is unset, so it fell back to the Windows system copy"
                    .to_string(),
            };
            RuntimeProbe {
                onnx_loaded: false,
                cuda_available: false,
                load_error: Some(format!(
                    "ONNX Runtime did not load ({tried}). Install it from the panel, or set \
                     ORT_DYLIB_PATH to a compatible onnxruntime.dll (the Windows System32 copy is \
                     CPU-only and often a version mismatch)."
                )),
                build_info: None,
            }
        }
    }
}

#[cfg(not(feature = "local-inference"))]
fn runtime_probe() -> RuntimeProbe {
    RuntimeProbe::default()
}

/// Snapshot of the local inference runtime capabilities, serialized to the
/// frontend by the `ai_gpu_info` command.
pub fn gpu_info() -> Value {
    let logical_cores = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(0);

    let RuntimeProbe {
        onnx_loaded,
        cuda_available,
        load_error,
        build_info,
    } = runtime_probe();

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
        // The loaded runtime's own build string (e.g. "...rel-1.22.0..."), so a
        // version skew vs. what this build targets is visible, not silent.
        "loadedRuntimeBuildInfo": build_info,
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "logicalCores": logical_cores,
        "executionProviders": providers,
        "recommendedProvider": recommended,
        // True only when CUDA is both compiled in AND usable on this host.
        "gpuAccelerationAvailable": CUDA_COMPILED && cuda_available,
    })
}
