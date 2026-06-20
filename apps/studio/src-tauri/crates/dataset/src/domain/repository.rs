//! The Item persistence contract.

use super::item::Item;
use vailabel_core::{DomainResult, Repository};

/// Persistence contract for the `Item` asset: CRUD (via [`Repository`]), a typed
/// list-by-project query, and atomic single-transaction save/delete used by the
/// application layer.
pub trait ItemRepository: Repository<Item> {
    /// All items belonging to `project_id`.
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<Item>>;

    /// One ordered page of a project's items (SQL `LIMIT`/`OFFSET`, not an
    /// in-memory slice), optionally filtered by a case-insensitive name search.
    /// Stable order so paging is consistent.
    fn list_page(
        &self,
        project_id: &str,
        offset: i64,
        limit: i64,
        search: Option<&str>,
    ) -> DomainResult<Vec<Item>>;

    /// Count a project's items (respecting the same optional name search), for
    /// pager totals — cheap `COUNT(*)`, never loads rows.
    fn count_by_project(&self, project_id: &str, search: Option<&str>) -> DomainResult<i64>;

    /// Create-or-update in one transaction; returns the stored image and whether
    /// it was newly created (`true`) vs updated (`false`).
    fn save_atomic(&self, image: &Item) -> DomainResult<(Item, bool)>;

    /// Delete in one transaction, returning the prior value (or `None`).
    fn delete_returning(&self, id: &str) -> DomainResult<Option<Item>>;
}
