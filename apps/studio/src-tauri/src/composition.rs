//! Composition-root adapters.
//!
//! Where the binary — the only place allowed to know both abstractions and
//! concrete infrastructure — bridges the DDD ports to their implementations and
//! maps the domain error to the transport error. Persistence is owned
//! per-module (typed Diesel over the shared `vailabel-db` connection); the only
//! port implemented here is event delivery, as one subscriber on the
//! [`vailabel_shared::EventBus`].

use serde_json::Value;
use vailabel_core::DomainError;
use vailabel_shared::{EventSubscriber, PortError};

use crate::AppError;

/// The Tauri event subscriber: delivers published domain events to the webview
/// by delegating to the existing [`crate::emit_domain_event`], so the
/// `studio://domain-event` wire format the frontend listens for is byte-for-byte
/// unchanged. Registered on the `EventBus` at the composition root.
pub struct TauriEventSubscriber {
    app: tauri::AppHandle,
}

impl TauriEventSubscriber {
    /// Build a subscriber bound to an app handle.
    pub fn new(app: tauri::AppHandle) -> Self {
        Self { app }
    }
}

impl EventSubscriber for TauriEventSubscriber {
    fn handle(&self, entity: &str, action: &str, payload: &Value) -> Result<(), PortError> {
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
