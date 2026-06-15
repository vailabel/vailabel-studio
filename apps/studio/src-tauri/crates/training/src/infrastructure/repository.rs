//! The `TrainingRun` repository, backed by typed Diesel over the shared
//! `vailabel-db` connection.

use diesel::prelude::*;
use vailabel_core::{DomainError, DomainResult, Repository};
use vailabel_db::{Db, DbError};
use vailabel_shared::now_iso;

use super::record::TrainingRunRow;
use super::schema::training_jobs;
use crate::domain::{TrainingRepository, TrainingRun};

/// Typed-Diesel implementation of [`TrainingRepository`].
pub struct DieselTrainingRepository {
    db: Db,
}

impl DieselTrainingRepository {
    /// Build the repository and ensure its table exists. The `CREATE TABLE IF
    /// NOT EXISTS` is idempotent, so it is safe alongside the residual store
    /// (which also creates it until Phase-5 T5 removes that).
    pub fn new(db: Db) -> DomainResult<Self> {
        db.with_conn(|conn| {
            diesel::sql_query(
                "CREATE TABLE IF NOT EXISTS training_jobs (
                    id           TEXT PRIMARY KEY NOT NULL,
                    project_id   TEXT NOT NULL,
                    model_id     TEXT,
                    name         TEXT NOT NULL DEFAULT '',
                    status       TEXT NOT NULL DEFAULT 'pending',
                    config_json  TEXT,
                    metrics_json TEXT,
                    progress     REAL NOT NULL DEFAULT 0.0,
                    log_path     TEXT,
                    error        TEXT,
                    created_at   TEXT NOT NULL,
                    updated_at   TEXT NOT NULL,
                    started_at   TEXT,
                    finished_at  TEXT
                )",
            )
            .execute(conn)?;
            diesel::sql_query(
                "CREATE INDEX IF NOT EXISTS idx_training_jobs_project
                    ON training_jobs (project_id, created_at)",
            )
            .execute(conn)?;
            Ok(())
        })
        .map_err(to_domain_err)?;
        Ok(Self { db })
    }

    fn upsert(&self, run: &TrainingRun) -> DomainResult<TrainingRun> {
        let now = now_iso();
        let row = TrainingRunRow::from_run(run, &now);
        self.db
            .with_conn(|conn| {
                diesel::replace_into(training_jobs::table)
                    .values(&row)
                    .execute(conn)?;
                Ok(row.into_run())
            })
            .map_err(to_domain_err)
    }
}

fn to_domain_err(err: DbError) -> DomainError {
    DomainError::repository(err.to_string())
}

impl Repository<TrainingRun> for DieselTrainingRepository {
    fn list(&self) -> DomainResult<Vec<TrainingRun>> {
        self.db
            .with_conn(|conn| {
                Ok(training_jobs::table
                    .select(TrainingRunRow::as_select())
                    .load::<TrainingRunRow>(conn)?
                    .into_iter()
                    .map(TrainingRunRow::into_run)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn get(&self, id: &str) -> DomainResult<Option<TrainingRun>> {
        self.db
            .with_conn(|conn| {
                Ok(training_jobs::table
                    .find(id)
                    .select(TrainingRunRow::as_select())
                    .first::<TrainingRunRow>(conn)
                    .optional()?
                    .map(TrainingRunRow::into_run))
            })
            .map_err(to_domain_err)
    }

    fn create(&self, entity: &TrainingRun) -> DomainResult<TrainingRun> {
        self.upsert(entity)
    }

    fn update(&self, entity: &TrainingRun) -> DomainResult<TrainingRun> {
        self.upsert(entity)
    }

    fn delete(&self, id: &str) -> DomainResult<()> {
        self.db
            .with_conn(|conn| {
                diesel::delete(training_jobs::table.find(id)).execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }
}

impl TrainingRepository for DieselTrainingRepository {
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<TrainingRun>> {
        let project_id = project_id.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(training_jobs::table
                    .filter(training_jobs::project_id.eq(project_id))
                    .select(TrainingRunRow::as_select())
                    .load::<TrainingRunRow>(conn)?
                    .into_iter()
                    .map(TrainingRunRow::into_run)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn mark_in_flight_failed(&self, reason: &str) -> DomainResult<Vec<TrainingRun>> {
        let reason = reason.to_string();
        self.db
            .transaction(move |conn| {
                let now = now_iso();
                let in_flight: Vec<TrainingRunRow> = training_jobs::table
                    .filter(training_jobs::status.eq_any(vec!["pending", "running"]))
                    .select(TrainingRunRow::as_select())
                    .load::<TrainingRunRow>(conn)?;
                let mut changed = Vec::with_capacity(in_flight.len());
                for mut row in in_flight {
                    row.status = "failed".to_string();
                    row.error = Some(reason.clone());
                    row.finished_at = Some(now.clone());
                    row.updated_at = now.clone();
                    diesel::replace_into(training_jobs::table)
                        .values(&row)
                        .execute(conn)?;
                    changed.push(row.into_run());
                }
                Ok(changed)
            })
            .map_err(to_domain_err)
    }
}
