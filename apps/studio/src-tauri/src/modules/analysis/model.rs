//! Re-export shim.
//!
//! The Dataset Intelligence model (report + sub-reports, summary, config, job)
//! and request payloads now live in the `vailabel-analysis` crate
//! (`domain` / `contracts`). This shim keeps `crate::modules::analysis::model::*`
//! valid for the analysis engine/service that remain in the binary.

pub use vailabel_analysis::contracts::*;
pub use vailabel_analysis::domain::*;
