//! Project lifecycle domain events.

use vailabel_core::DomainEvent;

/// A fact about a `Project` aggregate's lifecycle.
///
/// The [`ProjectEvent::action`] verb (`"created"`/`"updated"`/`"deleted"`) is
/// exactly the `action` the existing `studio://domain-event` channel carries,
/// so the application layer can publish it through the event port without
/// changing the wire contract the frontend listens for.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProjectEvent {
    /// A new project was created.
    Created { id: String },
    /// An existing project was updated.
    Updated { id: String },
    /// A project was deleted.
    Deleted { id: String },
}

impl ProjectEvent {
    /// The UI-channel action verb for this event.
    pub fn action(&self) -> &'static str {
        match self {
            ProjectEvent::Created { .. } => "created",
            ProjectEvent::Updated { .. } => "updated",
            ProjectEvent::Deleted { .. } => "deleted",
        }
    }
}

impl DomainEvent for ProjectEvent {
    fn event_type(&self) -> &str {
        match self {
            ProjectEvent::Created { .. } => "project.created",
            ProjectEvent::Updated { .. } => "project.updated",
            ProjectEvent::Deleted { .. } => "project.deleted",
        }
    }

    fn aggregate_id(&self) -> Option<&str> {
        match self {
            ProjectEvent::Created { id }
            | ProjectEvent::Updated { id }
            | ProjectEvent::Deleted { id } => Some(id),
        }
    }
}
