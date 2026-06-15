//! The Project persistence contract.

use super::project::Project;
use vailabel_core::{DomainResult, Repository};

/// Persistence contract for the `Project` aggregate.
///
/// Extends the generic CRUD [`Repository<Project>`] with atomic, single-transaction
/// operations used by the application layer's use cases (so the existence-check
/// and the write cannot interleave with a concurrent writer).
pub trait ProjectRepository: Repository<Project> {
    /// Create-or-update in one transaction; returns the stored project and
    /// whether it was newly created (`true`) vs updated (`false`).
    fn save_atomic(&self, project: &Project) -> DomainResult<(Project, bool)>;

    /// Delete in one transaction, returning the prior value (or `None` if it did
    /// not exist) for the deletion event payload.
    fn delete_returning(&self, id: &str) -> DomainResult<Option<Project>>;
}
