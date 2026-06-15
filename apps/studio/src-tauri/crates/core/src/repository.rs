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

/// A transactional boundary around one or more repository operations.
///
/// Implementations begin work on construction and commit on [`UnitOfWork::commit`];
/// dropping without committing rolls back. The domain depends on the trait; the
/// concrete transaction lives in infrastructure.
pub trait UnitOfWork {
    /// Commit all work performed within this unit.
    fn commit(self) -> DomainResult<()>;
}
