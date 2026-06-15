//! The analysis persistence port.
//!
//! Source rows (images/annotations/labels) and persisted reports are JSON blobs;
//! the binary implements this over its residual `DesktopStore`. Reads return the
//! raw stored [`Value`] so the JSON crossing IPC is byte-identical.

use serde_json::Value;
use vailabel_core::DomainResult;

use super::AnalysisReport;

/// Read access to the dataset under analysis + persistence for finished reports.
pub trait AnalysisRepository: Send + Sync {
    /// The project's images (raw stored JSON).
    fn list_images(&self, project_id: &str) -> DomainResult<Vec<Value>>;

    /// The project's annotations (raw stored JSON).
    fn list_annotations(&self, project_id: &str) -> DomainResult<Vec<Value>>;

    /// The project's labels (raw stored JSON).
    fn list_labels(&self, project_id: &str) -> DomainResult<Vec<Value>>;

    /// Persist a finished report (the adapter derives + stores its summary row).
    fn upsert_report(&self, report: &AnalysisReport) -> DomainResult<()>;

    /// Compact report summaries for a project, newest first.
    fn list_reports(&self, project_id: &str) -> DomainResult<Vec<Value>>;

    /// One full report by id.
    fn get_report(&self, id: &str) -> DomainResult<Option<Value>>;

    /// The most recent full report for a project.
    fn latest_report(&self, project_id: &str) -> DomainResult<Option<Value>>;

    /// Delete a report by id.
    fn delete_report(&self, id: &str) -> DomainResult<()>;
}
