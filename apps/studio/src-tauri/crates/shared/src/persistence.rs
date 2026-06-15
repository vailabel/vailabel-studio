//! The persistence port.
//!
//! [`EntitySource`] is a generic, technology-agnostic JSON entity store keyed
//! by a string `kind` (the table/collection name) and string id. Module
//! infrastructure layers implement their typed repositories *over* this port,
//! so they never name `diesel` or a concrete connection. The composition root
//! provides the one concrete implementation (SQLite-backed).

use serde_json::Value;
use thiserror::Error;

/// Error returned by a shared infrastructure port ([`EntitySource`],
/// [`crate::EventPublisher`]). It carries a stringified cause so that callers
/// in `core`/domain terms can map it to `DomainError::Repository` without
/// depending on any concrete infrastructure error type.
#[derive(Debug, Clone, Error)]
#[error("{0}")]
pub struct PortError(pub String);

impl PortError {
    /// Construct a port error from any message.
    pub fn new(message: impl Into<String>) -> Self {
        PortError(message.into())
    }

    /// Map this port error into a [`DomainError::Repository`].
    pub fn into_domain(self) -> vailabel_core::DomainError {
        vailabel_core::DomainError::Repository(self.0)
    }
}

/// A persistence-agnostic JSON entity store.
///
/// Mirrors the binary's existing `EntityStore` shape (kind-dispatched JSON
/// CRUD) but is free of `diesel`/`StoreError`, so domain crates can build
/// repositories on it. The binary bridges its `EntityStore`/`DesktopStore`
/// into this port with a thin newtype adapter.
pub trait EntitySource: Send + Sync {
    /// Insert or update an entity of `kind`, returning the stored value.
    fn upsert(&self, kind: &str, value: Value) -> Result<Value, PortError>;

    /// Fetch one entity of `kind` by id, or `None` if absent.
    fn get(&self, kind: &str, id: &str) -> Result<Option<Value>, PortError>;

    /// List all entities of `kind`.
    fn list(&self, kind: &str) -> Result<Vec<Value>, PortError>;

    /// List entities of `kind` whose `field` equals `value`.
    fn list_by_field(&self, kind: &str, field: &str, value: &str)
        -> Result<Vec<Value>, PortError>;

    /// Delete the entity of `kind` with the given id.
    fn delete(&self, kind: &str, id: &str) -> Result<(), PortError>;
}
