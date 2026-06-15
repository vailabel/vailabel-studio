//! `vailabel-models` — the Models module.
//!
//! Owns AI model management: install, download, update, delete, verify, load,
//! unload. Phase 1 extracts the pure request DTOs (the install/import/activation
//! payloads) into [`contracts`]; the `ModelArtifact`/`ModelVersion` aggregates,
//! the model registry, and the install/inference service logic remain in the
//! binary (they are coupled to HTTP/filesystem/ONNX) and migrate in later phases.

pub mod contracts;
