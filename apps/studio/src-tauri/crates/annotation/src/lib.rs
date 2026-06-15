//! `vailabel-annotation` — the Annotation module (Phase 1 boundary).
//!
//! Will own the `Annotation` and `LabelClass` aggregate roots and the shape
//! entities (`BoundingBox`, `Polygon`, `Mask`, `Keypoint`, `Classification`),
//! plus create/modify/delete/review/validate use cases. Annotations currently
//! flow through the binary's generic JSON `EntityStore`; the typed domain lands
//! in a later phase. The layer modules below establish the boundary now.

/// Entities, value objects, domain events, repository traits, errors.
pub mod domain {}
/// Commands, queries, handlers, DTOs, application services.
pub mod application {}
/// Repository implementations, mappers, adapters.
pub mod infrastructure {}
/// Public events/requests/responses other modules may depend on.
pub mod contracts {}
