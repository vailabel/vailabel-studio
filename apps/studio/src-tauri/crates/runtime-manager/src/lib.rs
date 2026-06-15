//! Embedded Python/FastAPI AI runtime lifecycle manager.
//!
//! This crate is deliberately **Tauri-free**: it takes plain paths/ports/token
//! (via [`RuntimeConfiguration`]) plus an event callback, and never sees an
//! `AppHandle`. All Tauri glue (resource resolution, `app.emit`, `app_data_dir`,
//! command wrappers, DB) lives in `src-tauri/src/domain/runtime/`, which depends
//! on this crate. Keeping it Tauri-free means the launcher/health/monitor logic
//! is unit-testable without a Tauri context.

pub mod client;
pub mod config;
pub mod error;
pub mod health;
pub mod launcher;
pub mod metrics;
pub mod monitor;
pub mod service;
pub mod types;

pub(crate) mod platform;

pub use client::RuntimeClient;
pub use config::RuntimeConfiguration;
pub use error::{Result, RuntimeError};
pub use service::RuntimeService;
pub use types::*;
