//! Training-run lifecycle domain events.

use vailabel_core::DomainEvent;

/// A fact about a training run's lifecycle. The [`TrainingEvent::action`] verb is
/// the `action` the `studio://domain-event` channel carries (entity
/// `"training_job"`, matching the pre-refactor events).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TrainingEvent {
    /// A run was created (persisted as `pending`).
    Created { id: String },
    /// A run's state changed (running/failed/canceled, progress, …).
    Updated { id: String },
}

impl TrainingEvent {
    /// The UI-channel action verb.
    pub fn action(&self) -> &'static str {
        match self {
            TrainingEvent::Created { .. } => "created",
            TrainingEvent::Updated { .. } => "updated",
        }
    }
}

impl DomainEvent for TrainingEvent {
    fn event_type(&self) -> &str {
        match self {
            TrainingEvent::Created { .. } => "training_run.created",
            TrainingEvent::Updated { .. } => "training_run.updated",
        }
    }

    fn aggregate_id(&self) -> Option<&str> {
        match self {
            TrainingEvent::Created { id } | TrainingEvent::Updated { id } => Some(id),
        }
    }
}
