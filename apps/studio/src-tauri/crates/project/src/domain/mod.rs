//! The Project domain layer: the aggregate, its events, and its repository
//! contract. Pure business types — no persistence, transport, or framework.

pub mod events;
pub mod project;
pub mod repository;

pub use events::ProjectEvent;
pub use project::{Project, ProjectAiConfig, ProjectConfig, ProjectExportConfig, ProjectGeneralConfig, ProjectStorageConfig};
pub use repository::ProjectRepository;
