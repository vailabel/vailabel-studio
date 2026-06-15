//! Domain events.
//!
//! A domain event is a fact about something that has already happened in the
//! domain (`ProjectCreated`, `AnnotationDeleted`, …). Events are carried
//! *inside application boundaries*; the infrastructure decides how (or whether)
//! to publish them outward (see the `EventBus`/`EventSubscriber` ports in
//! `vailabel-shared`). The domain never reaches for the transport.

/// A fact that has occurred in the domain.
///
/// Implementors provide a stable, dotted event type (e.g. `"project.created"`)
/// and the identity of the aggregate the event concerns. The typed per-module
/// event enums (`ProjectEvent`/`ImageEvent`/`LabelEvent`) implement this.
pub trait DomainEvent {
    /// Stable, machine-readable event name, e.g. `"project.created"`.
    fn event_type(&self) -> &str;

    /// Identity of the aggregate this event concerns, if any.
    fn aggregate_id(&self) -> Option<&str> {
        None
    }
}
