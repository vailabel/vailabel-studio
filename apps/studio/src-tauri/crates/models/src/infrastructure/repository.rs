//! Typed-Diesel implementations of the managed-model repositories over the
//! shared `vailabel-db` connection.

use diesel::prelude::*;
use vailabel_core::{DomainError, DomainResult, Repository};
use vailabel_db::{Db, DbError};
use vailabel_shared::now_iso;

use super::record::{AiModelRow, RuntimeModelRow};
use super::schema::{ai_models, runtime_models};
use crate::domain::{AiModel, AiModelRepository, RuntimeModel, RuntimeModelRepository};

fn to_domain_err(err: DbError) -> DomainError {
    DomainError::repository(err.to_string())
}

// ── AI models ─────────────────────────────────────────────────────────────────

/// Typed-Diesel implementation of [`AiModelRepository`].
pub struct DieselAiModelRepository {
    db: Db,
}

impl DieselAiModelRepository {
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    fn upsert(&self, entity: &AiModel) -> DomainResult<AiModel> {
        let now = now_iso();
        let row = AiModelRow::from_model(entity, &now);
        self.db
            .with_conn(|conn| {
                diesel::replace_into(ai_models::table)
                    .values(&row)
                    .execute(conn)?;
                Ok(row.into_model())
            })
            .map_err(to_domain_err)
    }
}

impl Repository<AiModel> for DieselAiModelRepository {
    fn list(&self) -> DomainResult<Vec<AiModel>> {
        self.db
            .with_conn(|conn| {
                Ok(ai_models::table
                    .select(AiModelRow::as_select())
                    .load::<AiModelRow>(conn)?
                    .into_iter()
                    .map(AiModelRow::into_model)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn get(&self, id: &str) -> DomainResult<Option<AiModel>> {
        let id = id.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(ai_models::table
                    .find(id)
                    .select(AiModelRow::as_select())
                    .first::<AiModelRow>(conn)
                    .optional()?
                    .map(AiModelRow::into_model))
            })
            .map_err(to_domain_err)
    }

    fn create(&self, entity: &AiModel) -> DomainResult<AiModel> {
        self.upsert(entity)
    }

    fn update(&self, entity: &AiModel) -> DomainResult<AiModel> {
        self.upsert(entity)
    }

    fn delete(&self, id: &str) -> DomainResult<()> {
        let id = id.to_string();
        self.db
            .with_conn(move |conn| {
                diesel::delete(ai_models::table.find(id)).execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }
}

impl AiModelRepository for DieselAiModelRepository {
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<AiModel>> {
        let project_id = project_id.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(ai_models::table
                    .filter(ai_models::project_id.eq(project_id))
                    .select(AiModelRow::as_select())
                    .load::<AiModelRow>(conn)?
                    .into_iter()
                    .map(AiModelRow::into_model)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn save_atomic(&self, model: &AiModel) -> DomainResult<(AiModel, bool)> {
        let now = now_iso();
        let row = AiModelRow::from_model(model, &now);
        self.db
            .transaction(|conn| {
                let existed = ai_models::table
                    .find(row.id.as_str())
                    .select(ai_models::id)
                    .first::<String>(conn)
                    .optional()?
                    .is_some();
                diesel::replace_into(ai_models::table)
                    .values(&row)
                    .execute(conn)?;
                Ok((row.into_model(), !existed))
            })
            .map_err(to_domain_err)
    }

    fn delete_returning(&self, id: &str) -> DomainResult<Option<AiModel>> {
        let id = id.to_string();
        self.db
            .transaction(move |conn| {
                let row = ai_models::table
                    .find(id.as_str())
                    .select(AiModelRow::as_select())
                    .first::<AiModelRow>(conn)
                    .optional()?;
                match row {
                    Some(row) => {
                        diesel::delete(ai_models::table.find(id.as_str())).execute(conn)?;
                        Ok(Some(row.into_model()))
                    }
                    None => Ok(None),
                }
            })
            .map_err(to_domain_err)
    }
}

// ── Runtime models ────────────────────────────────────────────────────────────

/// Typed-Diesel implementation of [`RuntimeModelRepository`].
pub struct DieselRuntimeModelRepository {
    db: Db,
}

impl DieselRuntimeModelRepository {
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    fn upsert(&self, entity: &RuntimeModel) -> DomainResult<RuntimeModel> {
        let now = now_iso();
        let row = RuntimeModelRow::from_model(entity, &now);
        self.db
            .with_conn(|conn| {
                diesel::replace_into(runtime_models::table)
                    .values(&row)
                    .execute(conn)?;
                Ok(row.into_model())
            })
            .map_err(to_domain_err)
    }
}

impl Repository<RuntimeModel> for DieselRuntimeModelRepository {
    fn list(&self) -> DomainResult<Vec<RuntimeModel>> {
        self.db
            .with_conn(|conn| {
                Ok(runtime_models::table
                    .select(RuntimeModelRow::as_select())
                    .load::<RuntimeModelRow>(conn)?
                    .into_iter()
                    .map(RuntimeModelRow::into_model)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn get(&self, id: &str) -> DomainResult<Option<RuntimeModel>> {
        let id = id.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(runtime_models::table
                    .find(id)
                    .select(RuntimeModelRow::as_select())
                    .first::<RuntimeModelRow>(conn)
                    .optional()?
                    .map(RuntimeModelRow::into_model))
            })
            .map_err(to_domain_err)
    }

    fn create(&self, entity: &RuntimeModel) -> DomainResult<RuntimeModel> {
        self.upsert(entity)
    }

    fn update(&self, entity: &RuntimeModel) -> DomainResult<RuntimeModel> {
        self.upsert(entity)
    }

    fn delete(&self, id: &str) -> DomainResult<()> {
        let id = id.to_string();
        self.db
            .with_conn(move |conn| {
                diesel::delete(runtime_models::table.find(id)).execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }
}

impl RuntimeModelRepository for DieselRuntimeModelRepository {
    fn save_atomic(&self, model: &RuntimeModel) -> DomainResult<(RuntimeModel, bool)> {
        let now = now_iso();
        let row = RuntimeModelRow::from_model(model, &now);
        self.db
            .transaction(|conn| {
                let existed = runtime_models::table
                    .find(row.id.as_str())
                    .select(runtime_models::id)
                    .first::<String>(conn)
                    .optional()?
                    .is_some();
                diesel::replace_into(runtime_models::table)
                    .values(&row)
                    .execute(conn)?;
                Ok((row.into_model(), !existed))
            })
            .map_err(to_domain_err)
    }

    fn delete_returning(&self, id: &str) -> DomainResult<Option<RuntimeModel>> {
        let id = id.to_string();
        self.db
            .transaction(move |conn| {
                let row = runtime_models::table
                    .find(id.as_str())
                    .select(RuntimeModelRow::as_select())
                    .first::<RuntimeModelRow>(conn)
                    .optional()?;
                match row {
                    Some(row) => {
                        diesel::delete(runtime_models::table.find(id.as_str())).execute(conn)?;
                        Ok(Some(row.into_model()))
                    }
                    None => Ok(None),
                }
            })
            .map_err(to_domain_err)
    }
}
