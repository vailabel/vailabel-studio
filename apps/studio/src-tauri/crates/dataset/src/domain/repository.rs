//! The Item persistence contract.

use super::item::Item;
use vailabel_core::{DomainResult, Repository};

/// Persistence contract for the `Item` asset: CRUD (via [`Repository`]), a typed
/// list-by-project query, and atomic single-transaction save/delete used by the
/// application layer.
pub trait ItemRepository: Repository<Item> {
    /// All items belonging to `project_id`.
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<Item>>;

    /// Create-or-update in one transaction; returns the stored image and whether
    /// it was newly created (`true`) vs updated (`false`).
    fn save_atomic(&self, image: &Item) -> DomainResult<(Item, bool)>;

    /// Delete in one transaction, returning the prior value (or `None`).
    fn delete_returning(&self, id: &str) -> DomainResult<Option<Item>>;
}
