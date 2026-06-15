//! Image lifecycle domain events.

use vailabel_core::DomainEvent;

/// A fact about an `Image` asset's lifecycle. The [`ImageEvent::action`] verb is
/// the `action` the `studio://domain-event` channel carries, so the application
/// layer publishes it through the event port without changing the wire contract.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ImageEvent {
    /// A new image was created.
    Created { id: String },
    /// An existing image was updated.
    Updated { id: String },
    /// An image was deleted.
    Deleted { id: String },
}

impl ImageEvent {
    /// The UI-channel action verb for this event.
    pub fn action(&self) -> &'static str {
        match self {
            ImageEvent::Created { .. } => "created",
            ImageEvent::Updated { .. } => "updated",
            ImageEvent::Deleted { .. } => "deleted",
        }
    }
}

impl DomainEvent for ImageEvent {
    fn event_type(&self) -> &str {
        match self {
            ImageEvent::Created { .. } => "image.created",
            ImageEvent::Updated { .. } => "image.updated",
            ImageEvent::Deleted { .. } => "image.deleted",
        }
    }

    fn aggregate_id(&self) -> Option<&str> {
        match self {
            ImageEvent::Created { id } | ImageEvent::Updated { id } | ImageEvent::Deleted { id } => {
                Some(id)
            }
        }
    }
}
