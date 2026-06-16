//! `vailabel-workspace` — app-level persistence that belongs to no business
//! domain.
//!
//! Three small aggregates the other modules don't own:
//! - **Settings** — key/value application configuration (keyed by a unique
//!   `key`, not by id).
//! - **History** — per-project undo/redo snapshots.
//! - **Secret keys** — a registry of the keychain entry *names* (the secret
//!   values themselves live in the OS keychain, never here).
//!
//! Layered like the other modules: [`domain`] (entities + repository contracts),
//! [`application`] (use-case services), [`infrastructure`] (typed Diesel over the
//! shared `vailabel-db` connection).

pub mod application;
pub mod domain;
pub mod infrastructure;

pub use domain::{History, Setting};
