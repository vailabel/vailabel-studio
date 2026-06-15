//! The event-publishing port.

use crate::error::PortError;
use serde_json::Value;

/// Port for publishing domain events outward (UI refresh, audit, integrations).
///
/// Application services depend on this trait rather than on Tauri. The binary
/// provides a `TauriEventPublisher` that emits on the `studio://domain-event`
/// channel by delegating to the existing `emit_domain_event`, so the wire
/// format the frontend listens for is unchanged.
///
/// The `(entity, action, payload)` shape mirrors the existing
/// `emit_domain_event(app, entity, action, &value)` call so the adapter is a
/// direct pass-through.
pub trait EventPublisher: Send + Sync {
    /// Publish that `action` (e.g. `"created"`, `"updated"`, `"deleted"`)
    /// happened to an entity of type `entity` (e.g. `"projects"`), carrying the
    /// affected entity's JSON `payload`.
    fn publish(&self, entity: &str, action: &str, payload: &Value) -> Result<(), PortError>;
}
