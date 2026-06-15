//! `vailabel-analysis` — the Dataset Intelligence module.
//!
//! The analysis report model (dataset health, analytics, quality validation,
//! image-quality, outliers, and the unified findings list) plus the request
//! DTOs. Conceptually this is a *dataset statistics/health* concern, layered
//! like the other module crates: `domain` holds the report model + the pure
//! `engine` (metadata analysis, geometry, outlier stats, report assembly) + the
//! `AnalysisRepository` port; `application` holds the `AnalysisAppService` use
//! cases + the `ImageDecoder` (pixel pass) and `AnalysisReporter` (progress)
//! ports; `infrastructure` holds the `image`-crate pixel decoder (the only layer
//! that reads image files). The background job lifecycle (threads + the
//! `analysis://progress` Tauri event) stays in the binary.

pub mod application;
pub mod contracts;
pub mod domain;
pub mod infrastructure;
