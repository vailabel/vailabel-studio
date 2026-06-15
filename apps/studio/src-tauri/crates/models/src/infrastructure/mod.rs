//! The infrastructure layer: ONNX-runtime-backed capability detection (and,
//! over later slices, the inference engines/installer). Gated behind the
//! `local-inference` feature for the `ort` parts; the only layer allowed `ort::`.

pub mod gpu;

pub use gpu::gpu_info;
