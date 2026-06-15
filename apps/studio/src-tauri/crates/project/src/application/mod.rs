//! The Project application layer: CQRS commands/queries and the use-case
//! service that orchestrates the repository and the event port.

pub mod commands;
pub mod queries;
pub mod service;

pub use commands::{DeleteProjectCommand, SaveProjectCommand};
pub use queries::{GetProjectQuery, ListProjectsQuery};
pub use service::ProjectAppService;
