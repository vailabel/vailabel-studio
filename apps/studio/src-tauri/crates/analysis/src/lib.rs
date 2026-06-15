//! `vailabel-analysis` — the Dataset Intelligence module.
//!
//! The analysis report model (dataset health, analytics, quality validation,
//! image-quality, outliers, and the unified findings list) plus the request
//! DTOs. Conceptually this is a *dataset statistics/health* concern; it is kept
//! as its own module crate for Phase 1 (1:1 with the existing `domain/analysis`).
//! Pure domain types — the analysis engine/service stay in the binary.

pub mod contracts;
pub mod domain;
