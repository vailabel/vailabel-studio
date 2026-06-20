//! Item lifecycle domain events.

use vailabel_core::DomainEvent;

/// A fact about an `Item` asset's lifecycle. The [`ItemEvent::action`] verb is
/// the `action` the `studio://domain-event` channel carries, so the application
/// layer publishes it through the event port without changing the wire contract.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ItemEvent {
    /// A new image was created.
    Created { id: String },
    /// An existing image was updated.
    Updated { id: String },
    /// An image was deleted.
    Deleted { id: String },
}

impl ItemEvent {
    /// The UI-channel action verb for this event.
    pub fn action(&self) -> &'static str {
        match self {
            ItemEvent::Created { .. } => "created",
            ItemEvent::Updated { .. } => "updated",
            ItemEvent::Deleted { .. } => "deleted",
        }
    }
}

impl DomainEvent for ItemEvent {
    fn event_type(&self) -> &str {
        match self {
            ItemEvent::Created { .. } => "item.created",
            ItemEvent::Updated { .. } => "item.updated",
            ItemEvent::Deleted { .. } => "item.deleted",
        }
    }

    fn aggregate_id(&self) -> Option<&str> {
        match self {
            ItemEvent::Created { id } | ItemEvent::Updated { id } | ItemEvent::Deleted { id } => {
                Some(id)
            }
        }
    }
}
