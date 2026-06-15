//! The TrainingRun persistence contract.

use super::run::TrainingRun;
use vailabel_core::{DomainResult, Repository};

/// Persistence contract for `TrainingRun`: CRUD (via [`Repository`]) + a
/// list-by-project query + the crash-reconcile transition.
pub trait TrainingRepository: Repository<TrainingRun> {
    /// All training runs for a project (most-recent first is the impl's choice).
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<TrainingRun>>;

    /// Mark every in-flight run (`pending`/`running`) as `failed` with `reason`
    /// and a finish timestamp, in one transaction; returns the changed runs (so
    /// the caller can publish an event per run). Used on runtime crash.
    fn mark_in_flight_failed(&self, reason: &str) -> DomainResult<Vec<TrainingRun>>;
}
