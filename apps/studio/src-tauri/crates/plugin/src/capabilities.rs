//! Capability traits — one per kind of pluggable AI operation.
//!
//! Each trait uses associated types for its request/response so a concrete
//! plugin defines its own payloads (an ONNX detector and a remote-runtime
//! detector can both be `DetectorPlugin`s with different `Request`s) while
//! callers depend only on the trait. All operations return
//! [`vailabel_core::DomainResult`].

use crate::metadata::PluginMetadata;
use vailabel_core::DomainResult;

/// Base trait every plugin implements: it can describe itself.
pub trait Plugin: Send + Sync {
    /// This plugin's identity/kind/version.
    fn metadata(&self) -> &PluginMetadata;
}

/// Detects objects (bounding boxes) in an input.
pub trait DetectorPlugin: Plugin {
    /// Input payload (e.g. an image reference + thresholds).
    type Request;
    /// Output payload (e.g. a list of boxes with labels/scores).
    type Detections;

    /// Run detection.
    fn detect(&self, request: Self::Request) -> DomainResult<Self::Detections>;
}

/// Produces segmentation masks for an input.
pub trait SegmenterPlugin: Plugin {
    /// Input payload (e.g. an image + point/box prompts).
    type Request;
    /// Output payload (e.g. masks / polygons).
    type Masks;

    /// Run segmentation.
    fn segment(&self, request: Self::Request) -> DomainResult<Self::Masks>;
}

/// Recognizes text in an input.
pub trait OcrPlugin: Plugin {
    /// Input payload (e.g. an image / region).
    type Request;
    /// Output payload (e.g. recognized lines with boxes).
    type Text;

    /// Run OCR.
    fn recognize(&self, request: Self::Request) -> DomainResult<Self::Text>;
}

/// Exports a dataset/annotations to an external format.
pub trait ExporterPlugin: Plugin {
    /// Input payload (e.g. a dataset selection + options).
    type Request;
    /// Output payload (e.g. a path/artifact descriptor).
    type Output;

    /// Run the export.
    fn export(&self, request: Self::Request) -> DomainResult<Self::Output>;
}

/// Trains / fine-tunes a model.
pub trait TrainerPlugin: Plugin {
    /// Input payload (e.g. dataset + hyperparameters).
    type Request;
    /// Output payload (e.g. a training-run handle).
    type Run;

    /// Start a training run.
    fn train(&self, request: Self::Request) -> DomainResult<Self::Run>;
}

/// Generates embeddings (e.g. CLIP) for search / similarity.
pub trait EmbeddingPlugin: Plugin {
    /// Input payload (e.g. an image or text).
    type Request;
    /// Output payload (e.g. a vector).
    type Embedding;

    /// Compute an embedding.
    fn embed(&self, request: Self::Request) -> DomainResult<Self::Embedding>;
}
