//! Domain events.
//!
//! A domain event is a fact about something that has already happened in the
//! domain (`ProjectCreated`, `AnnotationDeleted`, …). Events are carried
//! *inside application boundaries*; the infrastructure decides how (or whether)
//! to publish them outward. The domain never reaches for the transport.

use serde::{Deserialize, Serialize};

/// A fact that has occurred in the domain.
///
/// Implementors provide a stable, dotted event type (e.g. `"project.created"`)
/// and the identity of the aggregate the event concerns. Keeping this trait
/// transport-agnostic is what lets the same event drive a UI refresh, an audit
/// log, or an integration handler without the domain knowing which.
pub trait DomainEvent {
    /// Stable, machine-readable event name, e.g. `"project.created"`.
    fn event_type(&self) -> &str;

    /// Identity of the aggregate this event concerns, if any.
    fn aggregate_id(&self) -> Option<&str> {
        None
    }
}

/// A domain event wrapped with transport metadata.
///
/// `occurred_at` is an RFC 3339 timestamp string rather than a `chrono` type so
/// that `core` stays dependency-free; the composition root stamps it.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventEnvelope<E> {
    /// The wrapped domain event payload.
    pub event: E,
    /// RFC 3339 timestamp of when the event was recorded.
    pub occurred_at: String,
}

impl<E> EventEnvelope<E> {
    /// Wrap an event with the time it occurred (RFC 3339 string).
    pub fn new(event: E, occurred_at: impl Into<String>) -> Self {
        Self {
            event,
            occurred_at: occurred_at.into(),
        }
    }
}
