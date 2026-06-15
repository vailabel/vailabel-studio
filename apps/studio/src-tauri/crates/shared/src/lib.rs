//! `vailabel-shared` — the shared kernel.
//!
//! Cross-cutting primitives every module may use, plus the [`EventPublisher`]
//! port through which application services emit domain events outward without
//! naming Tauri:
//!
//! - [`clock`] — wall-clock access ([`now_iso`], [`Clock`]).
//! - [`id`] — identifier generation and the type-tagged [`Id`] newtype.
//! - [`event`] — the [`EventPublisher`] port + [`PortError`].
//!
//! `shared` depends only on `vailabel-core` (plus serde/uuid/chrono). Persistence
//! is owned per-module (each module's `infrastructure/` runs typed Diesel over
//! the shared `vailabel-db` connection), so there is no generic persistence port
//! here. Like `core`, this crate must never depend on `diesel`, `tauri`, etc.
//! See `crates/ARCHITECTURE.md`.

pub mod clock;
pub mod error;
pub mod event;
pub mod id;

pub use clock::{now_iso, Clock, SystemClock};
pub use error::PortError;
pub use event::EventPublisher;
pub use id::{new_id, Id};
