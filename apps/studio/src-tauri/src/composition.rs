//! Composition-root adapters.
//!
//! This module is where the binary — the only place allowed to know about both
//! abstractions and concrete infrastructure — bridges the pure DDD *ports*
//! (`vailabel-shared`) to its real implementations (the SQLite `EntityStore`
//! and Tauri event emission), and maps the domain error type to the transport
//! error type. Domain and module crates never import any of this.

use std::sync::Arc;

use serde_json::Value;
use vailabel_core::DomainError;
use vailabel_shared::{EntitySource, EventPublisher, PortError};

use crate::store::{EntityStore, StoreError};
use crate::AppError;

/// Bridges the binary's `EntityStore` (diesel/`StoreError`-coupled) to the pure
/// [`vailabel_shared::EntitySource`] port, stringifying `StoreError` into
/// [`PortError`]. Module infrastructure repositories build on the port, so they
/// reach the SQLite store without ever naming diesel.
pub struct EntitySourceAdapter {
    inner: Arc<dyn EntityStore>,
}

impl EntitySourceAdapter {
    /// Wrap a concrete entity store (e.g. `StoreHandle`).
    pub fn new(inner: Arc<dyn EntityStore>) -> Self {
        Self { inner }
    }
}

fn to_port(err: StoreError) -> PortError {
    PortError(err.to_string())
}

impl EntitySource for EntitySourceAdapter {
    fn upsert(&self, kind: &str, value: Value) -> Result<Value, PortError> {
        self.inner.upsert_entity(kind, value).map_err(to_port)
    }

    fn get(&self, kind: &str, id: &str) -> Result<Option<Value>, PortError> {
        self.inner.get_entity(kind, id).map_err(to_port)
    }

    fn list(&self, kind: &str) -> Result<Vec<Value>, PortError> {
        self.inner.list_entities(kind).map_err(to_port)
    }

    fn list_by_field(
        &self,
        kind: &str,
        field: &str,
        value: &str,
    ) -> Result<Vec<Value>, PortError> {
        self.inner
            .list_by_field(kind, field, value)
            .map_err(to_port)
    }

    fn delete(&self, kind: &str, id: &str) -> Result<(), PortError> {
        self.inner.delete_entity(kind, id).map_err(to_port)
    }
}

/// Bridges the [`vailabel_shared::EventPublisher`] port to Tauri by delegating
/// to the existing [`crate::emit_domain_event`]. The `studio://domain-event`
/// wire format the frontend listens for is therefore byte-for-byte unchanged.
pub struct TauriEventPublisher {
    app: tauri::AppHandle,
}

impl TauriEventPublisher {
    /// Build a publisher bound to an app handle.
    pub fn new(app: tauri::AppHandle) -> Self {
        Self { app }
    }
}

impl EventPublisher for TauriEventPublisher {
    fn publish(&self, entity: &str, action: &str, payload: &Value) -> Result<(), PortError> {
        crate::emit_domain_event(&self.app, entity, action, payload)
            .map_err(|err| PortError(err.to_string()))
    }
}

/// The domain → transport error boundary. Application layers return
/// [`DomainError`]; Tauri commands return [`AppError`]. Every variant stringifies
/// to the same message the frontend already receives, so the IPC error contract
/// is preserved.
impl From<DomainError> for AppError {
    fn from(err: DomainError) -> Self {
        AppError::Message(err.to_string())
    }
}
