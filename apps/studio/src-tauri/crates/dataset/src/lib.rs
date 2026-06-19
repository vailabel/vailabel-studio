//! `vailabel-dataset` — the Dataset module.
//!
//! Owns the dataset's image assets. Phase 2 gives it the full layering:
//! [`domain`] (the `Item` entity + `ItemRepository` contract), [`application`]
//! (CQRS + `ItemAppService`), [`infrastructure`] (typed Diesel persistence over
//! the shared `vailabel-db` connection), and [`contracts`] (request DTOs).
//! Import/export, statistics, duplicate detection, and dataset health land in
//! later phases.

pub mod application;
pub mod contracts;
pub mod domain;
pub mod infrastructure;

pub use domain::Item;
