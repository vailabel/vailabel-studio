//! Persistence contracts for the managed-model aggregates.

use vailabel_core::{DomainResult, Repository};

use super::ai_model::AiModel;
use super::runtime_model::RuntimeModel;

/// Persistence contract for the `AiModel` catalog: CRUD (via [`Repository`]), a
/// list-by-project query, and atomic save/delete.
pub trait AiModelRepository: Repository<AiModel> {
    /// All models scoped to `project_id`.
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<AiModel>>;

    /// Create-or-update in one transaction; returns the stored model and whether
    /// it was newly created (`true`) vs updated (`false`).
    fn save_atomic(&self, model: &AiModel) -> DomainResult<(AiModel, bool)>;

    /// Delete in one transaction, returning the prior value (or `None`).
    fn delete_returning(&self, id: &str) -> DomainResult<Option<AiModel>>;
}

/// Persistence contract for the `RuntimeModel` registry: CRUD (via [`Repository`])
/// plus atomic save/delete.
pub trait RuntimeModelRepository: Repository<RuntimeModel> {
    /// Create-or-update in one transaction; returns the stored model and whether
    /// it was newly created (`true`) vs updated (`false`).
    fn save_atomic(&self, model: &RuntimeModel) -> DomainResult<(RuntimeModel, bool)>;

    /// Delete in one transaction, returning the prior value (or `None`).
    fn delete_returning(&self, id: &str) -> DomainResult<Option<RuntimeModel>>;
}
