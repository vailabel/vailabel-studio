//! LabelClass + Annotation lifecycle domain events.

use vailabel_core::DomainEvent;

/// A fact about an `Annotation`'s lifecycle. The [`AnnotationEvent::action`] verb
/// is the `action` the `studio://domain-event` channel carries (entity
/// `"annotations"`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AnnotationEvent {
    /// A new annotation was created.
    Created { id: String },
    /// An existing annotation was updated.
    Updated { id: String },
    /// An annotation was deleted.
    Deleted { id: String },
}

impl AnnotationEvent {
    /// The UI-channel action verb for this event.
    pub fn action(&self) -> &'static str {
        match self {
            AnnotationEvent::Created { .. } => "created",
            AnnotationEvent::Updated { .. } => "updated",
            AnnotationEvent::Deleted { .. } => "deleted",
        }
    }
}

impl DomainEvent for AnnotationEvent {
    fn event_type(&self) -> &str {
        match self {
            AnnotationEvent::Created { .. } => "annotation.created",
            AnnotationEvent::Updated { .. } => "annotation.updated",
            AnnotationEvent::Deleted { .. } => "annotation.deleted",
        }
    }

    fn aggregate_id(&self) -> Option<&str> {
        match self {
            AnnotationEvent::Created { id }
            | AnnotationEvent::Updated { id }
            | AnnotationEvent::Deleted { id } => Some(id),
        }
    }
}

/// A fact about a `LabelClass`'s lifecycle. The [`LabelEvent::action`] verb is
/// the `action` the `studio://domain-event` channel carries (entity `"labels"`),
/// so the application layer publishes it without changing the wire contract.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LabelEvent {
    /// A new label class was created.
    Created { id: String },
    /// An existing label class was updated.
    Updated { id: String },
    /// A label class was deleted.
    Deleted { id: String },
}

impl LabelEvent {
    /// The UI-channel action verb for this event.
    pub fn action(&self) -> &'static str {
        match self {
            LabelEvent::Created { .. } => "created",
            LabelEvent::Updated { .. } => "updated",
            LabelEvent::Deleted { .. } => "deleted",
        }
    }
}

impl DomainEvent for LabelEvent {
    fn event_type(&self) -> &str {
        match self {
            LabelEvent::Created { .. } => "label.created",
            LabelEvent::Updated { .. } => "label.updated",
            LabelEvent::Deleted { .. } => "label.deleted",
        }
    }

    fn aggregate_id(&self) -> Option<&str> {
        match self {
            LabelEvent::Created { id } | LabelEvent::Updated { id } | LabelEvent::Deleted { id } => {
                Some(id)
            }
        }
    }
}
