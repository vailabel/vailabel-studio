//! `vailabel-annotation` — the Annotation module.
//!
//! Phase 2 owns the `LabelClass` aggregate (the project's label catalog) with
//! full layering: [`domain`] (the `LabelClass` entity + `LabelRepository`
//! contract), [`application`] (CQRS + `LabelClassAppService`),
//! [`infrastructure`] (typed Diesel persistence over the shared `vailabel-db`
//! connection), and [`contracts`] (request DTOs).
//!
//! The `Annotation` aggregate and the shape entities (`BoundingBox`, `Polygon`,
//! `Mask`, `Keypoint`, `Classification`) land in a later phase.

pub mod application;
pub mod contracts;
pub mod domain;
pub mod infrastructure;

pub use domain::LabelClass;
