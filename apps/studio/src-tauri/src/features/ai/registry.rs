//! Re-export shim.
//!
//! The local model registry (the catalog of known models + their capabilities)
//! now lives in `vailabel_models::domain::registry`. This shim keeps the paths
//! `crate::features::ai::registry::{RegistryModel, REGISTRY, registry_json, find}`
//! valid so `commands.rs` (the `ai_model_registry` command) and `plugin.rs` (the
//! dispatcher's `super::registry::find`) compile unchanged.

pub use vailabel_models::domain::registry::*;
