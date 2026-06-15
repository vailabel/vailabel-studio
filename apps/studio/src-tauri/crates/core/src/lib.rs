//! `vailabel-core` — the pure heart of the domain.
//!
//! This crate defines the building blocks every business module is expressed
//! in terms of: identity, aggregates, value objects, domain events, the
//! repository contract, specifications, paging, and the domain error type.
//!
//! # The dependency rule
//!
//! `core` is the *root* of the workspace dependency graph. It depends on
//! nothing but `serde` (for serializable contracts) and `thiserror` (for the
//! error type). It must **never** gain a dependency on a persistence,
//! transport, or UI concern — no `diesel`, `tauri`, `reqwest`, `opendal`,
//! `ort`, filesystem, or process APIs. Module domain layers depend on `core`;
//! infrastructure depends on the modules; the Tauri binary composes them all.
//! See `crates/ARCHITECTURE.md`.

pub mod entity;
pub mod error;
pub mod event;
pub mod paging;
pub mod repository;
pub mod specification;

pub use entity::{AggregateRoot, Entity, Identifiable, ValueObject};
pub use error::{DomainError, DomainResult, Result};
pub use event::{DomainEvent, EventEnvelope};
pub use paging::{PageRequest, PagedResult};
pub use repository::{PagedRepository, Repository, UnitOfWork};
pub use specification::Specification;
