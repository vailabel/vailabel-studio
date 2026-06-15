//! The `LabelClass` repository, backed by typed Diesel queries over the shared
//! `vailabel-db` connection.

use diesel::prelude::*;
use vailabel_core::{DomainError, DomainResult, Repository};
use vailabel_db::{Db, DbError};
use vailabel_shared::now_iso;

use super::record::LabelRow;
use super::schema::labels;
use crate::domain::{LabelClass, LabelRepository};

/// Typed-Diesel implementation of [`LabelRepository`].
pub struct DieselLabelRepository {
    db: Db,
}

impl DieselLabelRepository {
    /// Build the repository over the shared connection handle.
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    fn upsert(&self, entity: &LabelClass) -> DomainResult<LabelClass> {
        let now = now_iso();
        let row = LabelRow::from_label(entity, &now);
        self.db
            .with_conn(|conn| {
                diesel::replace_into(labels::table)
                    .values(&row)
                    .execute(conn)?;
                Ok(row.into_label())
            })
            .map_err(to_domain_err)
    }
}

fn to_domain_err(err: DbError) -> DomainError {
    DomainError::repository(err.to_string())
}

impl Repository<LabelClass> for DieselLabelRepository {
    fn list(&self) -> DomainResult<Vec<LabelClass>> {
        self.db
            .with_conn(|conn| {
                Ok(labels::table
                    .select(LabelRow::as_select())
                    .load::<LabelRow>(conn)?
                    .into_iter()
                    .map(LabelRow::into_label)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn get(&self, id: &str) -> DomainResult<Option<LabelClass>> {
        self.db
            .with_conn(|conn| {
                Ok(labels::table
                    .find(id)
                    .select(LabelRow::as_select())
                    .first::<LabelRow>(conn)
                    .optional()?
                    .map(LabelRow::into_label))
            })
            .map_err(to_domain_err)
    }

    fn create(&self, entity: &LabelClass) -> DomainResult<LabelClass> {
        self.upsert(entity)
    }

    fn update(&self, entity: &LabelClass) -> DomainResult<LabelClass> {
        self.upsert(entity)
    }

    fn delete(&self, id: &str) -> DomainResult<()> {
        self.db
            .with_conn(|conn| {
                diesel::delete(labels::table.find(id)).execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }
}

impl LabelRepository for DieselLabelRepository {
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<LabelClass>> {
        let project_id = project_id.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(labels::table
                    .filter(labels::project_id.eq(project_id))
                    .select(LabelRow::as_select())
                    .load::<LabelRow>(conn)?
                    .into_iter()
                    .map(LabelRow::into_label)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn save_atomic(&self, label: &LabelClass) -> DomainResult<(LabelClass, bool)> {
        let now = now_iso();
        let row = LabelRow::from_label(label, &now);
        self.db
            .transaction(|conn| {
                let existed = labels::table
                    .find(row.id.as_str())
                    .select(labels::id)
                    .first::<String>(conn)
                    .optional()?
                    .is_some();
                diesel::replace_into(labels::table)
                    .values(&row)
                    .execute(conn)?;
                Ok((row.into_label(), !existed))
            })
            .map_err(to_domain_err)
    }

    fn delete_returning(&self, id: &str) -> DomainResult<Option<LabelClass>> {
        let id = id.to_string();
        self.db
            .transaction(move |conn| {
                let row = labels::table
                    .find(id.as_str())
                    .select(LabelRow::as_select())
                    .first::<LabelRow>(conn)
                    .optional()?;
                match row {
                    Some(row) => {
                        diesel::delete(labels::table.find(id.as_str())).execute(conn)?;
                        Ok(Some(row.into_label()))
                    }
                    None => Ok(None),
                }
            })
            .map_err(to_domain_err)
    }
}
