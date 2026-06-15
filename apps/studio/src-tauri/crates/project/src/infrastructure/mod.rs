//! The Project infrastructure layer: a repository implemented over the shared
//! [`vailabel_shared::EntitySource`] JSON port (no diesel, no Tauri).

pub mod repository;

pub use repository::{project_repository, JsonRepository};
