//! The unified `studio://activity` channel: one event stream for every
//! long-running backend operation (downloads, installs, ingest, analysis,
//! training, cloud sync) so the webview always knows "what is the backend doing
//! right now". Each operation owns a stable [`ActivityEvent::id`]; emitting again
//! with the same id updates that task in place. The frontend `ActivityProvider`
//! aggregates these into a single activity indicator.
//!
//! This sits alongside [`super::events`] (`studio://domain-event`), which carries
//! *data mutations* (refetch-after-save), not progress.

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter};

use super::entity::now_iso;

/// Tauri event name carrying every [`ActivityEvent`].
pub const ACTIVITY_EVENT_NAME: &str = "studio://activity";

/// A snapshot of one long-running backend task. Wire format is camelCase; the
/// frontend keys tasks by `id` and replaces on each new snapshot.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEvent {
    /// Stable id for this task — re-emitting with the same id updates it.
    pub id: String,
    /// Category, e.g. `"runtime-install"`, `"cloud-sync"`, `"video-ingest"`.
    /// Drives the indicator's icon/label and lets feature viewmodels filter.
    pub kind: String,
    /// Human-readable headline for the indicator.
    pub title: String,
    /// Lifecycle: `"active"` (in progress), `"done"`, or `"error"`.
    pub phase: String,
    /// Detail line — the current stage or latest message.
    pub message: String,
    /// Determinate progress in 0–100, or `None` while indeterminate.
    pub percent: Option<f64>,
    /// Raw counter (bytes or items completed), for richer display.
    pub current: Option<u64>,
    /// Raw total (bytes or items), paired with [`Self::current`].
    pub total: Option<u64>,
    /// What `current`/`total` count: `"bytes"` or `"items"`.
    pub unit: Option<String>,
    /// Optional feature-specific payload (e.g. the `VideoJob` / `AnalysisJob`)
    /// so a feature viewmodel can read its rich job off the same channel.
    pub data: Option<Value>,
    pub occurred_at: String,
}

impl ActivityEvent {
    fn new(
        id: impl Into<String>,
        kind: impl Into<String>,
        title: impl Into<String>,
        phase: &str,
    ) -> Self {
        Self {
            id: id.into(),
            kind: kind.into(),
            title: title.into(),
            phase: phase.to_string(),
            message: String::new(),
            percent: None,
            current: None,
            total: None,
            unit: None,
            data: None,
            occurred_at: now_iso(),
        }
    }

    /// An in-progress task.
    pub fn active(
        id: impl Into<String>,
        kind: impl Into<String>,
        title: impl Into<String>,
    ) -> Self {
        Self::new(id, kind, title, "active")
    }

    /// A finished task — the indicator auto-dismisses it shortly after.
    pub fn done(
        id: impl Into<String>,
        kind: impl Into<String>,
        title: impl Into<String>,
    ) -> Self {
        Self::new(id, kind, title, "done")
    }

    /// A failed task — the indicator keeps it until the user dismisses it.
    pub fn error(
        id: impl Into<String>,
        kind: impl Into<String>,
        title: impl Into<String>,
    ) -> Self {
        Self::new(id, kind, title, "error")
    }

    /// Phase from a job status string (`"completed"`/`"failed"`/other).
    pub fn from_status(
        id: impl Into<String>,
        kind: impl Into<String>,
        title: impl Into<String>,
        status: &str,
    ) -> Self {
        let phase = match status {
            "completed" | "succeeded" | "done" => "done",
            "failed" | "error" | "canceled" | "cancelled" => "error",
            _ => "active",
        };
        Self::new(id, kind, title, phase)
    }

    pub fn message(mut self, message: impl Into<String>) -> Self {
        self.message = message.into();
        self
    }

    /// Set an explicit determinate percentage (0–100).
    pub fn percent(mut self, percent: Option<f64>) -> Self {
        self.percent = percent.map(|p| p.clamp(0.0, 100.0));
        self
    }

    /// Byte progress — fills `current`/`total`/`unit` and derives `percent`.
    pub fn bytes(mut self, received: u64, total: u64) -> Self {
        self.current = Some(received);
        self.unit = Some("bytes".into());
        if total > 0 {
            self.total = Some(total);
            self.percent = Some((received as f64 / total as f64 * 100.0).clamp(0.0, 100.0));
        }
        self
    }

    /// Item-count progress — fills `current`/`total`/`unit` and derives `percent`.
    pub fn items(mut self, completed: u64, total: u64) -> Self {
        self.current = Some(completed);
        self.unit = Some("items".into());
        if total > 0 {
            self.total = Some(total);
            self.percent = Some((completed as f64 / total as f64 * 100.0).clamp(0.0, 100.0));
        }
        self
    }

    /// Attach a feature-specific payload for viewmodels reading this channel.
    pub fn data(mut self, data: Value) -> Self {
        self.data = Some(data);
        self
    }

    /// Broadcast this snapshot to the webview.
    pub fn emit(self, app: &AppHandle) {
        let _ = app.emit(ACTIVITY_EVENT_NAME, self);
    }
}

/// Broadcast an [`ActivityEvent`] to the webview. Errors (no webview yet) are
/// swallowed — progress reporting must never fail the underlying operation.
pub fn emit_activity(app: &AppHandle, event: ActivityEvent) {
    event.emit(app);
}
