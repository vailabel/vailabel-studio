//! The infrastructure layer: the typed Diesel repositories for the `ai_models` /
//! `runtime_models` tables over the shared `vailabel-db` connection.

pub mod record;
pub mod repository;
pub mod schema;

pub use repository::{DieselAiModelRepository, DieselRuntimeModelRepository};
