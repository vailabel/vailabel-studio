//! The repository contract.
//!
//! Repository *traits* belong to the domain — they express what the domain
//! needs from persistence in domain terms ([`DomainResult`], aggregate types).
//! Concrete implementations belong to infrastructure and are injected at the
//! composition root. No method here mentions SQL, a connection, or a store.

use crate::error::DomainResult;
use crate::paging::{PageRequest, PagedResult};

/// CRUD persistence for an aggregate root `T`, keyed by string id.
///
/// Returns [`DomainResult`] so callers never see an infrastructure error type.
pub trait Repository<T>: Send + Sync {
    /// List all aggregates.
    fn list(&self) -> DomainResult<Vec<T>>;

    /// Fetch one aggregate by id, or `None` if it does not exist.
    fn get(&self, id: &str) -> DomainResult<Option<T>>;

    /// Persist a new aggregate and return the stored form.
    fn create(&self, entity: &T) -> DomainResult<T>;

    /// Persist changes to an existing aggregate and return the stored form.
    fn update(&self, entity: &T) -> DomainResult<T>;

    /// Remove the aggregate with the given id.
    fn delete(&self, id: &str) -> DomainResult<()>;
}

/// Optional paged listing for repositories backing large collections.
pub trait PagedRepository<T>: Repository<T> {
    /// List one page of aggregates plus the total count.
    fn list_paged(&self, page: PageRequest) -> DomainResult<PagedResult<T>>;
}

// NOTE: the unit-of-work / transactional boundary is delivered as
// `vailabel_db::Db::transaction` (a closure transaction over the shared SQLite
// connection) consumed by the per-module repositories' atomic `save_atomic`/
// `delete_returning` methods. A commit-style `UnitOfWork` trait was removed in
// Phase 3 — it was unused and mismatched diesel's closure transactions.
