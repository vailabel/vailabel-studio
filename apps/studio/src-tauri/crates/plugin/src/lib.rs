//! `vailabel-plugin` — the plugin framework.
//!
//! A generic, technology-agnostic contract for pluggable AI capabilities. Each
//! capability is an **object-safe** trait (request/response cross as
//! `serde_json::Value`), so a concrete plugin (a runtime-backed detector, a SAM
//! segmenter, a COCO exporter, …) can be stored behind `Arc<dyn …>` and managed
//! by the registry (added next). The lifecycle is the install→load→enable⇄
//! disable→unload [`PluginState`] machine.
//!
//! This crate is pure: it depends only on `vailabel-core`, `serde`, and
//! `serde_json`. It owns no concrete plugins — those are implemented and
//! registered at the composition root.

pub mod capabilities;
pub mod metadata;

pub use capabilities::{
    DetectorPlugin, EmbeddingPlugin, ExporterPlugin, OcrPlugin, Plugin, SegmenterPlugin,
    TrainerPlugin,
};
pub use metadata::{PluginKind, PluginMetadata, PluginState};
