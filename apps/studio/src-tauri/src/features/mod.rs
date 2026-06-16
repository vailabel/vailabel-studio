//! Vertical feature slices. Each slice owns its Tauri command handlers
//! (`commands.rs`) alongside the composition-root adapters they need (service
//! adapters, port impls), so a command just dispatches to its module.

pub mod annotation;
pub mod ai;
pub mod analysis;
pub mod cloud;
pub mod copilot;
pub mod dataset;
pub mod plugins;
pub mod projects;
pub mod runtime;
pub mod training;
pub mod video;
pub mod workspace;
pub mod system;
