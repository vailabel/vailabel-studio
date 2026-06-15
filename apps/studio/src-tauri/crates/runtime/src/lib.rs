//! `vailabel-runtime` — the runtime module's anti-corruption layer.
//!
//! Communication with the external Python/FastAPI runtime (discovery, startup,
//! shutdown, health checks, training/inference/export requests) is already
//! implemented in the Tauri-free [`runtime_manager`] crate. This facade
//! re-exports it under the `vailabel_runtime` name so the rest of the workspace
//! refers to the runtime module by its module name, and gives later phases a
//! home for runtime `domain`/`contracts` types alongside the ACL.
//!
//! No business logic lives here — by design this module is purely an
//! anti-corruption boundary. The Tauri glue (path resolution, the model
//! catalog, download/verify, command wrappers) stays in the binary at
//! `src/domain/runtime/` for Phase 1.

#[doc(inline)]
pub use runtime_manager::*;
