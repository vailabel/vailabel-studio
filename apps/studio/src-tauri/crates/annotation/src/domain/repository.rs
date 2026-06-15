//! The LabelClass persistence contract.

use super::label_class::LabelClass;
use vailabel_core::{DomainResult, Repository};

/// Persistence contract for `LabelClass`: CRUD (via [`Repository`]), a typed
/// list-by-project query, and atomic single-transaction save/delete used by the
/// application layer.
pub trait LabelRepository: Repository<LabelClass> {
    /// All label classes belonging to `project_id`.
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<LabelClass>>;

    /// Create-or-update in one transaction; returns the stored label and whether
    /// it was newly created (`true`) vs updated (`false`).
    fn save_atomic(&self, label: &LabelClass) -> DomainResult<(LabelClass, bool)>;

    /// Delete in one transaction, returning the prior value (or `None`).
    fn delete_returning(&self, id: &str) -> DomainResult<Option<LabelClass>>;
}
