//! `vailabel-shared` — the shared kernel.
//!
//! Cross-cutting primitives every module may use, and the *ports* (abstract
//! interfaces) through which module infrastructure talks to the outside world
//! without naming a concrete technology:
//!
//! - [`clock`] — wall-clock access ([`now_iso`], [`Clock`]).
//! - [`id`] — identifier generation and the type-tagged [`Id`] newtype.
//! - [`persistence`] — the [`EntitySource`] JSON-store port + [`PortError`].
//! - [`event`] — the [`EventPublisher`] port for emitting domain events outward.
//!
//! `shared` depends only on `vailabel-core` (plus serde/uuid/chrono). Like
//! `core`, it must never depend on `diesel`, `tauri`, `reqwest`, `opendal`,
//! `ort`, or the filesystem — those live in the composition root, which
//! *implements* these ports. See `crates/ARCHITECTURE.md`.

pub mod clock;
pub mod event;
pub mod id;
pub mod persistence;

pub use clock::{now_iso, Clock, SystemClock};
pub use event::EventPublisher;
pub use id::{new_id, Id};
pub use persistence::{EntitySource, PortError};
