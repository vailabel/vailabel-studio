//! A JSON-port-backed repository.

use std::marker::PhantomData;
use std::sync::Arc;

use serde::{de::DeserializeOwned, Serialize};
use serde_json::Value;
use vailabel_core::{DomainError, DomainResult, Repository};
use vailabel_shared::{EntitySource, PortError};

use crate::domain::Project;

/// A generic [`Repository`] backed by the shared [`EntitySource`] JSON port.
///
/// Mirrors the binary's historical `JsonCrudRepository` (insert and update both
/// go through `upsert`) but speaks [`DomainError`] and the diesel-free port, so
/// behavior is identical while the type stays pure. It is parameterized over
/// the entity `T` and the store `kind` (table name).
pub struct JsonRepository<T> {
    source: Arc<dyn EntitySource>,
    kind: &'static str,
    _entity: PhantomData<fn() -> T>,
}

impl<T> JsonRepository<T> {
    /// Build a repository over `source`, storing entities under `kind`.
    pub fn new(source: Arc<dyn EntitySource>, kind: &'static str) -> Self {
        Self {
            source,
            kind,
            _entity: PhantomData,
        }
    }
}

fn parse<T: DeserializeOwned>(value: Value) -> DomainResult<T> {
    serde_json::from_value(value).map_err(|e| DomainError::repository(e.to_string()))
}

fn to_value<T: Serialize>(entity: &T) -> DomainResult<Value> {
    serde_json::to_value(entity).map_err(|e| DomainError::repository(e.to_string()))
}

impl<T> Repository<T> for JsonRepository<T>
where
    T: Serialize + DeserializeOwned + Send + Sync + 'static,
{
    fn list(&self) -> DomainResult<Vec<T>> {
        self.source
            .list(self.kind)
            .map_err(PortError::into_domain)?
            .into_iter()
            .map(parse)
            .collect()
    }

    fn get(&self, id: &str) -> DomainResult<Option<T>> {
        self.source
            .get(self.kind, id)
            .map_err(PortError::into_domain)?
            .map(parse)
            .transpose()
    }

    fn create(&self, entity: &T) -> DomainResult<T> {
        let saved = self
            .source
            .upsert(self.kind, to_value(entity)?)
            .map_err(PortError::into_domain)?;
        parse(saved)
    }

    fn update(&self, entity: &T) -> DomainResult<T> {
        let saved = self
            .source
            .upsert(self.kind, to_value(entity)?)
            .map_err(PortError::into_domain)?;
        parse(saved)
    }

    fn delete(&self, id: &str) -> DomainResult<()> {
        self.source
            .delete(self.kind, id)
            .map_err(PortError::into_domain)
    }
}

/// Build a `Project` repository wired to the `"projects"` store kind. The
/// returned value implements [`crate::domain::ProjectRepository`] via the
/// blanket impl over [`Repository<Project>`].
pub fn project_repository(source: Arc<dyn EntitySource>) -> JsonRepository<Project> {
    JsonRepository::new(source, "projects")
}
