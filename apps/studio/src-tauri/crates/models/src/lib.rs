//! `vailabel-models` — the Models module.
//!
//! Owns AI model management: install, download, update, delete, verify, load,
//! unload. Phase 1 extracts the pure request DTOs (the install/import/activation
//! payloads) into [`contracts`]; the `ModelArtifact`/`ModelVersion` aggregates,
//! the model registry, and the install/inference service logic remain in the
//! binary (they are coupled to HTTP/filesystem/ONNX) and migrate in later phases.
//!
//! [`domain`] holds the first slice of that pure logic — model-identity
//! inference (family/variant/rank/runtime, registry version string) and
//! class-name resolution — extracted from the binary's `AiService`. No I/O.

pub mod contracts;
pub mod domain;
