//! Composition-root adapters.
//!
//! Where the binary — the only place allowed to know both abstractions and
//! concrete infrastructure — bridges the DDD ports to their implementations and
//! maps the domain error to the transport error. Persistence is now owned
//! per-module (typed Diesel over the shared `vailabel-db` connection), so the
//! only port implemented here is event publishing.

use serde_json::Value;
use vailabel_core::DomainError;
use vailabel_shared::{EventPublisher, PortError};

use crate::AppError;

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
            .map_err(|err| PortError::new(err.to_string()))
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
