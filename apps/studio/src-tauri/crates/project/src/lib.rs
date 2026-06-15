//! `vailabel-project` — the Project module.
//!
//! The Phase 1 reference module, showing the target layering end-to-end:
//!
//! - [`domain`] — the `Project` aggregate root, its lifecycle events, and the
//!   `ProjectRepository` persistence contract. Pure: depends only on `core`.
//! - [`application`] — CQRS commands/queries and the [`application::ProjectAppService`]
//!   use cases, which orchestrate the repository and publish events through the
//!   [`vailabel_shared::EventPublisher`] port (never Tauri directly).
//! - [`infrastructure`] — a `JsonRepository<T>` implemented over the
//!   [`vailabel_shared::EntitySource`] port (no diesel).
//! - [`contracts`] — request DTOs other layers/modules consume.

pub mod application;
pub mod contracts;
pub mod domain;
pub mod infrastructure;

pub use domain::Project;
