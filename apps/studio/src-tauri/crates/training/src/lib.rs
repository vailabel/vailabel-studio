//! `vailabel-training` — the Training module (Phase 1 boundary).
//!
//! Will own the `TrainingRun` and `Experiment` aggregate roots and the `Metric`,
//! `Checkpoint`, and `TrainingLog` entities, plus training-job orchestration,
//! experiment tracking, metrics, evaluation, and model export. Today training
//! is driven from the binary via the runtime module; the typed domain lands in
//! a later phase. The layer modules below establish the boundary now.

/// Entities, value objects, domain events, repository traits, errors.
pub mod domain {}
/// Commands, queries, handlers, DTOs, application services.
pub mod application {}
/// Repository implementations, mappers, adapters.
pub mod infrastructure {}
/// Public events/requests/responses other modules may depend on.
pub mod contracts {}
