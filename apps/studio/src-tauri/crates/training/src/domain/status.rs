//! The training-run status value object.

use serde::{Deserialize, Serialize};

/// A training run's status. A transparent string newtype (the runtime's
/// vocabulary — `"pending"`/`"running"`/`"completed"`/`"failed"`/`"canceled"`),
/// so any value round-trips exactly while domain logic gets named constructors
/// and the `is_in_flight` predicate the crash-reconcile relies on.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct TrainingStatus(String);

impl TrainingStatus {
    /// Wrap an arbitrary status string.
    pub fn new(status: impl Into<String>) -> Self {
        Self(status.into())
    }

    /// `"pending"` — persisted before the runtime call.
    pub fn pending() -> Self {
        Self("pending".into())
    }

    /// `"running"` — the runtime accepted the job.
    pub fn running() -> Self {
        Self("running".into())
    }

    /// `"failed"` — the runtime rejected the job or crashed mid-flight.
    pub fn failed() -> Self {
        Self("failed".into())
    }

    /// `"canceled"` — the user stopped the job.
    pub fn canceled() -> Self {
        Self("canceled".into())
    }

    /// The underlying status string.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Whether the job is still in flight (`pending`/`running`) — the set the
    /// crash reconcile transitions to `failed`.
    pub fn is_in_flight(&self) -> bool {
        matches!(self.0.as_str(), "pending" | "running")
    }
}

impl Default for TrainingStatus {
    fn default() -> Self {
        Self::pending()
    }
}
