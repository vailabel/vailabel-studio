//! Embedded AI Runtime — Tauri integration layer.
//!
//! `glue` resolves bundled paths into a `RuntimeConfiguration` and owns the
//! Model Manager download logic; `commands` exposes the Tauri command surface.
//! The lifecycle/health/HTTP logic lives in the Tauri-free `runtime-manager`
//! crate, which `AppState` holds as `Arc<RuntimeService>`.

pub mod commands;
pub mod glue;
