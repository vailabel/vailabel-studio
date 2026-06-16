//! Workspace lifecycle domain events. The `action` verb is what the
//! `studio://domain-event` channel carries, so the application layer publishes
//! these through the event port without changing the wire contract.

use vailabel_core::DomainEvent;

/// A fact about a `Setting`'s lifecycle.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SettingEvent {
    Created { id: String },
    Updated { id: String },
}

impl SettingEvent {
    pub fn action(&self) -> &'static str {
        match self {
            SettingEvent::Created { .. } => "created",
            SettingEvent::Updated { .. } => "updated",
        }
    }
}

impl DomainEvent for SettingEvent {
    fn event_type(&self) -> &str {
        match self {
            SettingEvent::Created { .. } => "setting.created",
            SettingEvent::Updated { .. } => "setting.updated",
        }
    }

    fn aggregate_id(&self) -> Option<&str> {
        match self {
            SettingEvent::Created { id } | SettingEvent::Updated { id } => Some(id),
        }
    }
}

/// A fact about a `History` snapshot's lifecycle.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HistoryEvent {
    Created { id: String },
    Updated { id: String },
}

impl HistoryEvent {
    pub fn action(&self) -> &'static str {
        match self {
            HistoryEvent::Created { .. } => "created",
            HistoryEvent::Updated { .. } => "updated",
        }
    }
}

impl DomainEvent for HistoryEvent {
    fn event_type(&self) -> &str {
        match self {
            HistoryEvent::Created { .. } => "history.created",
            HistoryEvent::Updated { .. } => "history.updated",
        }
    }

    fn aggregate_id(&self) -> Option<&str> {
        match self {
            HistoryEvent::Created { id } | HistoryEvent::Updated { id } => Some(id),
        }
    }
}
