//! Capability traits — one per kind of pluggable AI operation.
//!
//! Each trait is **object-safe** (so `Arc<dyn DetectorPlugin>` can live in the
//! [`crate::PluginRegistry`]): requests and responses cross as
//! `serde_json::Value` — the same JSON shape the IPC boundary uses — and a
//! concrete plugin parses the request into its own typed payload internally
//! (e.g. a runtime-backed detector parses into `runtime_manager::DetectRequest`).
//! All operations return [`vailabel_core::DomainResult`].

use crate::metadata::PluginMetadata;
use serde_json::Value;
use vailabel_core::DomainResult;

/// Base trait every plugin implements: it can describe itself.
pub trait Plugin: Send + Sync {
    /// This plugin's identity/kind/version.
    fn metadata(&self) -> &PluginMetadata;
}

/// Detects objects (bounding boxes) in an input image.
pub trait DetectorPlugin: Plugin {
    /// Run detection. `request`/return are capability-specific JSON.
    fn detect(&self, request: &Value) -> DomainResult<Value>;
}

/// Produces segmentation masks for an input.
pub trait SegmenterPlugin: Plugin {
    /// Run segmentation.
    fn segment(&self, request: &Value) -> DomainResult<Value>;
}

/// Recognizes text in an input.
pub trait OcrPlugin: Plugin {
    /// Run OCR.
    fn recognize(&self, request: &Value) -> DomainResult<Value>;
}

/// Exports a dataset/annotations to an external format.
pub trait ExporterPlugin: Plugin {
    /// Run the export.
    fn export(&self, request: &Value) -> DomainResult<Value>;
}

/// Trains / fine-tunes a model.
pub trait TrainerPlugin: Plugin {
    /// Start a training run.
    fn train(&self, request: &Value) -> DomainResult<Value>;
}

/// Generates embeddings (e.g. CLIP) for search / similarity.
pub trait EmbeddingPlugin: Plugin {
    /// Compute an embedding.
    fn embed(&self, request: &Value) -> DomainResult<Value>;
}
