//! `vailabel-plugin` — the plugin framework.
//!
//! A generic, technology-agnostic contract for pluggable AI capabilities. Each
//! capability is a trait with associated request/response types, so a concrete
//! plugin (YOLO detector, SAM segmenter, PaddleOCR, a COCO exporter, …) chooses
//! its own payloads while the rest of the system depends only on the trait.
//!
//! This crate is pure: it depends solely on `vailabel-core` (for
//! [`vailabel_core::DomainResult`]) and `serde` (for plugin metadata). It owns
//! no concrete plugins — those are registered at the composition root in later
//! phases.

pub mod capabilities;
pub mod lifecycle;
pub mod metadata;

pub use capabilities::{
    DetectorPlugin, EmbeddingPlugin, ExporterPlugin, OcrPlugin, Plugin, SegmenterPlugin,
    TrainerPlugin,
};
pub use lifecycle::PluginLifecycle;
pub use metadata::{PluginKind, PluginMetadata, PluginState};
