//! Typed-Diesel implementation of [`AnalysisRepository`].
//!
//! Source rows (images/annotations/labels) are read through the owning modules'
//! repositories and re-serialized to JSON (so the analysis engine sees the same
//! shape it always has). Finished reports persist in the `analysis_reports`
//! JSON-blob table via raw SQL over the shared `vailabel-db` connection.

use std::sync::Arc;

use diesel::prelude::*;
use diesel::sql_types::Text;
use serde_json::Value;
use vailabel_annotation::domain::{AnnotationRepository, LabelRepository};
use vailabel_core::{DomainError, DomainResult};
use vailabel_dataset::domain::ItemRepository;
use vailabel_db::{Db, DbError};

use crate::domain::{AnalysisReport, AnalysisRepository, ReportSummary};

fn to_domain_err(err: DbError) -> DomainError {
    DomainError::repository(err.to_string())
}

fn serde_err(err: impl ToString) -> DomainError {
    DomainError::repository(err.to_string())
}

/// Reads source rows via the owning module repositories; persists reports via
/// Diesel over the shared connection.
pub struct DieselAnalysisRepository {
    db: Db,
    images: Arc<dyn ItemRepository>,
    annotations: Arc<dyn AnnotationRepository>,
    labels: Arc<dyn LabelRepository>,
}

impl DieselAnalysisRepository {
    pub fn new(
        db: Db,
        images: Arc<dyn ItemRepository>,
        annotations: Arc<dyn AnnotationRepository>,
        labels: Arc<dyn LabelRepository>,
    ) -> Self {
        Self {
            db,
            images,
            annotations,
            labels,
        }
    }
}

impl AnalysisRepository for DieselAnalysisRepository {
    fn list_images(&self, project_id: &str) -> DomainResult<Vec<Value>> {
        self.images
            .list_by_project(project_id)?
            .iter()
            .map(|image| serde_json::to_value(image).map_err(serde_err))
            .collect()
    }

    fn list_annotations(&self, project_id: &str) -> DomainResult<Vec<Value>> {
        Ok(self
            .annotations
            .list_by_project(project_id)?
            .iter()
            .map(|annotation| annotation.to_value())
            .collect())
    }

    fn list_labels(&self, project_id: &str) -> DomainResult<Vec<Value>> {
        self.labels
            .list_by_project(project_id)?
            .iter()
            .map(|label| serde_json::to_value(label).map_err(serde_err))
            .collect()
    }

    fn upsert_report(&self, report: &AnalysisReport) -> DomainResult<()> {
        let summary = ReportSummary {
            id: report.id.clone(),
            project_id: report.project_id.clone(),
            created_at: report.created_at.clone(),
            item_count: report.item_count,
            annotation_count: report.annotation_count,
            health: report.health.clone(),
        };
        let summary_json = serde_json::to_string(&summary).map_err(serde_err)?;
        let report_json = serde_json::to_string(report).map_err(serde_err)?;
        self.db
            .with_conn(|conn| {
                diesel::sql_query(
                    "INSERT OR REPLACE INTO analysis_reports \
                     (id, project_id, created_at, summary_json, report_json) \
                     VALUES (?, ?, ?, ?, ?)",
                )
                .bind::<Text, _>(&report.id)
                .bind::<Text, _>(&report.project_id)
                .bind::<Text, _>(&report.created_at)
                .bind::<Text, _>(&summary_json)
                .bind::<Text, _>(&report_json)
                .execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }

    fn list_reports(&self, project_id: &str) -> DomainResult<Vec<Value>> {
        let project_id = project_id.to_string();
        let rows = self
            .db
            .with_conn(move |conn| {
                Ok(diesel::sql_query(
                    "SELECT summary_json FROM analysis_reports \
                     WHERE project_id = ? ORDER BY created_at DESC",
                )
                .bind::<Text, _>(project_id)
                .load::<SummaryRow>(conn)?)
            })
            .map_err(to_domain_err)?;
        rows.into_iter()
            .map(|row| serde_json::from_str(&row.summary_json).map_err(serde_err))
            .collect()
    }

    fn get_report(&self, id: &str) -> DomainResult<Option<Value>> {
        self.load_report(
            "SELECT report_json FROM analysis_reports WHERE id = ? LIMIT 1",
            id,
        )
    }

    fn latest_report(&self, project_id: &str) -> DomainResult<Option<Value>> {
        self.load_report(
            "SELECT report_json FROM analysis_reports \
             WHERE project_id = ? ORDER BY created_at DESC LIMIT 1",
            project_id,
        )
    }

    fn delete_report(&self, id: &str) -> DomainResult<()> {
        let id = id.to_string();
        self.db
            .with_conn(move |conn| {
                diesel::sql_query("DELETE FROM analysis_reports WHERE id = ?")
                    .bind::<Text, _>(id)
                    .execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }
}

impl DieselAnalysisRepository {
    fn load_report(&self, query: &'static str, bind: &str) -> DomainResult<Option<Value>> {
        let bind = bind.to_string();
        let row = self
            .db
            .with_conn(move |conn| {
                Ok(diesel::sql_query(query)
                    .bind::<Text, _>(bind)
                    .load::<ReportRow>(conn)?
                    .into_iter()
                    .next())
            })
            .map_err(to_domain_err)?;
        match row {
            Some(row) => Ok(Some(
                serde_json::from_str(&row.report_json).map_err(serde_err)?,
            )),
            None => Ok(None),
        }
    }
}

#[derive(QueryableByName)]
struct SummaryRow {
    #[diesel(sql_type = Text)]
    summary_json: String,
}

#[derive(QueryableByName)]
struct ReportRow {
    #[diesel(sql_type = Text)]
    report_json: String,
}
