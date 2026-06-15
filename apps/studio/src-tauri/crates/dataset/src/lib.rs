//! `vailabel-dataset` — the Dataset module.
//!
//! Owns the dataset's image assets and (in later phases) import/export,
//! validation, statistics, duplicate detection, and dataset health. Phase 1
//! extracts the pure [`domain::Image`] entity and the request DTOs; the
//! repository/service that operate on images currently remain in the binary.

pub mod contracts;
pub mod domain;

pub use domain::Image;
