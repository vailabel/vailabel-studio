//! The Tauri IPC layer: every `#[tauri::command]` handler, grouped by feature.
//!
//! Handlers are thin — they deserialize the payload, call the corresponding
//! application service (held in [`crate::AppState`]), and serialize the result.
//! The business logic lives in the module crates; `src/` is only the Tauri shell.

pub mod ai;
pub mod analysis;
pub mod cloud;
pub mod images;
pub mod labels;
pub mod projects;
pub mod runtime;
pub mod video;
