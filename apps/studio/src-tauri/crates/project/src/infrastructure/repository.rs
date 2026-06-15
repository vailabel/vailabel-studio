//! The `Project` repository, backed by typed Diesel queries over the shared
//! `vailabel-db` connection (replaces the Phase-1 generic JSON repository).

use std::collections::HashMap;

use diesel::dsl::count_star;
use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use vailabel_core::{DomainError, DomainResult, Repository};
use vailabel_db::{Db, DbError};
use vailabel_shared::now_iso;

use super::record::ProjectRow;
use super::schema::{images, projects};
use crate::domain::{Project, ProjectRepository};

/// Typed-Diesel implementation of [`crate::domain::ProjectRepository`].
pub struct DieselProjectRepository {
    db: Db,
}

impl DieselProjectRepository {
    /// Build the repository over the shared connection handle.
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    fn image_count(
        conn: &mut SqliteConnection,
        project_id: &str,
    ) -> Result<i64, diesel::result::Error> {
        images::table
            .filter(images::project_id.eq(project_id))
            .count()
            .get_result(conn)
    }

    fn image_counts(
        conn: &mut SqliteConnection,
    ) -> Result<HashMap<String, i64>, diesel::result::Error> {
        let rows: Vec<(String, i64)> = images::table
            .group_by(images::project_id)
            .select((images::project_id, count_star()))
            .load(conn)?;
        Ok(rows.into_iter().collect())
    }

    fn upsert(&self, entity: &Project) -> DomainResult<Project> {
        let now = now_iso();
        let row = ProjectRow::from_project(entity, &now);
        self.db
            .with_conn(|conn| {
                diesel::replace_into(projects::table)
                    .values(&row)
                    .execute(conn)?;
                let count = Self::image_count(conn, &row.id)?;
                Ok(row.into_project(count))
            })
            .map_err(to_domain_err)
    }
}

fn to_domain_err(err: DbError) -> DomainError {
    DomainError::repository(err.to_string())
}

impl Repository<Project> for DieselProjectRepository {
    fn list(&self) -> DomainResult<Vec<Project>> {
        self.db
            .with_conn(|conn| {
                let rows = projects::table
                    .select(ProjectRow::as_select())
                    .load::<ProjectRow>(conn)?;
                let counts = Self::image_counts(conn)?;
                Ok(rows
                    .into_iter()
                    .map(|row| {
                        let count = counts.get(&row.id).copied().unwrap_or(0);
                        row.into_project(count)
                    })
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn get(&self, id: &str) -> DomainResult<Option<Project>> {
        self.db
            .with_conn(|conn| {
                let row = projects::table
                    .find(id)
                    .select(ProjectRow::as_select())
                    .first::<ProjectRow>(conn)
                    .optional()?;
                Ok(match row {
                    Some(row) => {
                        let count = Self::image_count(conn, id)?;
                        Some(row.into_project(count))
                    }
                    None => None,
                })
            })
            .map_err(to_domain_err)
    }

    fn create(&self, entity: &Project) -> DomainResult<Project> {
        self.upsert(entity)
    }

    fn update(&self, entity: &Project) -> DomainResult<Project> {
        self.upsert(entity)
    }

    fn delete(&self, id: &str) -> DomainResult<()> {
        self.db
            .with_conn(|conn| {
                diesel::delete(projects::table.find(id)).execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }
}

impl ProjectRepository for DieselProjectRepository {
    fn save_atomic(&self, project: &Project) -> DomainResult<(Project, bool)> {
        let now = now_iso();
        let row = ProjectRow::from_project(project, &now);
        self.db
            .transaction(|conn| {
                // Existence-check + write in one transaction (no TOCTOU window).
                let existed = projects::table
                    .find(row.id.as_str())
                    .select(projects::id)
                    .first::<String>(conn)
                    .optional()?
                    .is_some();
                diesel::replace_into(projects::table)
                    .values(&row)
                    .execute(conn)?;
                let count = Self::image_count(conn, &row.id)?;
                Ok((row.into_project(count), !existed))
            })
            .map_err(to_domain_err)
    }

    fn delete_returning(&self, id: &str) -> DomainResult<Option<Project>> {
        let id = id.to_string();
        self.db
            .transaction(move |conn| {
                let row = projects::table
                    .find(id.as_str())
                    .select(ProjectRow::as_select())
                    .first::<ProjectRow>(conn)
                    .optional()?;
                match row {
                    Some(row) => {
                        let count = Self::image_count(conn, &id)?;
                        diesel::delete(projects::table.find(id.as_str())).execute(conn)?;
                        Ok(Some(row.into_project(count)))
                    }
                    None => Ok(None),
                }
            })
            .map_err(to_domain_err)
    }
}
