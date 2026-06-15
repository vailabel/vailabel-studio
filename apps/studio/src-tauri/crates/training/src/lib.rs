//! `vailabel-training` — the Training module.
//!
//! Owns the `TrainingRun` aggregate (the training-job lifecycle), its repository
//! contract + Diesel persistence (`infrastructure`), and a `TrainingAppService`
//! (`application`) that orchestrates persistence + domain events + an async
//! `TrainingRuntime` port (backed by the embedded Python runtime at the
//! composition root). Training *execution* is the runtime ACL's job; this module
//! owns the run's domain + persistence + lifecycle.

pub mod application;
pub mod domain;

pub use domain::{TrainingRun, TrainingStatus};
