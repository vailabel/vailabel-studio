//! Composition-root adapter: the `vailabel-analysis` persistence port over the
//! residual `DesktopStore`. Source rows go through the generic `list_by_field`
//! entity store; reports use the dedicated `analysis_reports` JSON-blob table.
//! Keeping the store here (rather than moving the table into the crate) makes
//! the analysis migration logic-only; the crate stays unaware of Diesel/SQLite.

use std::sync::{Arc, Mutex, MutexGuard};

use serde_json::Value;
use vailabel_analysis::domain::{AnalysisReport, AnalysisRepository, ReportSummary};
use vailabel_core::{DomainError, DomainResult};

use crate::store::DesktopStore;

/// Map any store failure into the domain's repository variant.
fn repo(error: impl ToString) -> DomainError {
    DomainError::repository(error.to_string())
}

pub struct AnalysisStoreRepository {
    store: Arc<Mutex<DesktopStore>>,
}

impl AnalysisStoreRepository {
    pub fn new(store: Arc<Mutex<DesktopStore>>) -> Self {
        Self { store }
    }

    fn guard(&self) -> DomainResult<MutexGuard<'_, DesktopStore>> {
        self.store
            .lock()
            .map_err(|_| DomainError::repository("Desktop store is unavailable"))
    }
}

impl AnalysisRepository for AnalysisStoreRepository {
    fn list_images(&self, project_id: &str) -> DomainResult<Vec<Value>> {
        self.guard()?
            .list_by_field("images", "project_id", project_id)
            .map_err(repo)
    }

    fn list_annotations(&self, project_id: &str) -> DomainResult<Vec<Value>> {
        self.guard()?
            .list_by_field("annotations", "project_id", project_id)
            .map_err(repo)
    }

    fn list_labels(&self, project_id: &str) -> DomainResult<Vec<Value>> {
        self.guard()?
            .list_by_field("labels", "project_id", project_id)
            .map_err(repo)
    }

    fn upsert_report(&self, report: &AnalysisReport) -> DomainResult<()> {
        let summary = ReportSummary {
            id: report.id.clone(),
            project_id: report.project_id.clone(),
            created_at: report.created_at.clone(),
            image_count: report.image_count,
            annotation_count: report.annotation_count,
            health: report.health.clone(),
        };
        let summary_json = serde_json::to_string(&summary).map_err(repo)?;
        let report_json = serde_json::to_string(report).map_err(repo)?;
        self.guard()?
            .upsert_analysis_report(
                &report.id,
                &report.project_id,
                &report.created_at,
                &summary_json,
                &report_json,
            )
            .map_err(repo)
    }

    fn list_reports(&self, project_id: &str) -> DomainResult<Vec<Value>> {
        self.guard()?.list_analysis_reports(project_id).map_err(repo)
    }

    fn get_report(&self, id: &str) -> DomainResult<Option<Value>> {
        self.guard()?.get_analysis_report(id).map_err(repo)
    }

    fn latest_report(&self, project_id: &str) -> DomainResult<Option<Value>> {
        self.guard()?.latest_analysis_report(project_id).map_err(repo)
    }

    fn delete_report(&self, id: &str) -> DomainResult<()> {
        self.guard()?.delete_analysis_report(id).map_err(repo)
    }
}
