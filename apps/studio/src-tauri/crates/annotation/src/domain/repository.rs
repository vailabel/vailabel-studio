//! The LabelClass persistence contract.

use super::label_class::LabelClass;
use vailabel_core::{DomainResult, Repository};

/// Persistence contract for `LabelClass`: CRUD plus a typed query for listing a
/// project's labels.
pub trait LabelRepository: Repository<LabelClass> {
    /// All label classes belonging to `project_id`.
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<LabelClass>>;
}
