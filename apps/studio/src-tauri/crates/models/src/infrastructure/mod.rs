//! The infrastructure layer: ONNX-runtime-backed capability detection (gated
//! behind `local-inference`; the only layer allowed `ort::`) plus the typed
//! Diesel repositories for the `ai_models` / `runtime_models` tables over the
//! shared `vailabel-db` connection.

pub mod gpu;
pub mod record;
pub mod repository;
pub mod schema;

pub use gpu::gpu_info;
pub use repository::{DieselAiModelRepository, DieselRuntimeModelRepository};
