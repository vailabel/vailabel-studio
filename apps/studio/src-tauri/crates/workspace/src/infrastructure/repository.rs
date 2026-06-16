//! Typed-Diesel implementations of the workspace repositories over the shared
//! `vailabel-db` connection.

use diesel::prelude::*;
use vailabel_core::{DomainError, DomainResult, Repository};
use vailabel_db::{Db, DbError};
use vailabel_shared::{new_id, now_iso};

use super::record::{HistoryRow, SecretKeyRow, SettingRow};
use super::schema::{history, secret_keys, settings};
use crate::domain::{
    History, HistoryRepository, SecretKeyRepository, Setting, SettingRepository,
};

fn to_domain_err(err: DbError) -> DomainError {
    DomainError::repository(err.to_string())
}

// ── Settings ──────────────────────────────────────────────────────────────────

/// Typed-Diesel implementation of [`SettingRepository`].
pub struct DieselSettingRepository {
    db: Db,
}

impl DieselSettingRepository {
    pub fn new(db: Db) -> Self {
        Self { db }
    }
}

impl SettingRepository for DieselSettingRepository {
    fn list(&self) -> DomainResult<Vec<Setting>> {
        self.db
            .with_conn(|conn| {
                Ok(settings::table
                    .select(SettingRow::as_select())
                    .load::<SettingRow>(conn)?
                    .into_iter()
                    .map(SettingRow::into_setting)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn get_by_key(&self, key: &str) -> DomainResult<Option<Setting>> {
        let key = key.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(settings::table
                    .filter(settings::key.eq(key))
                    .select(SettingRow::as_select())
                    .first::<SettingRow>(conn)
                    .optional()?
                    .map(SettingRow::into_setting))
            })
            .map_err(to_domain_err)
    }

    fn upsert_by_key(&self, setting: &Setting) -> DomainResult<Setting> {
        let now = now_iso();
        let row = SettingRow::from_setting(setting, &now);
        self.db
            .with_conn(move |conn| {
                let mut row = row;
                // Preserve the existing surrogate id when the key already exists.
                if !row.key.is_empty() {
                    if let Some(existing_id) = settings::table
                        .filter(settings::key.eq(&row.key))
                        .select(settings::id)
                        .first::<String>(conn)
                        .optional()?
                    {
                        row.id = existing_id;
                    }
                }
                diesel::replace_into(settings::table)
                    .values(&row)
                    .execute(conn)?;
                Ok(row.into_setting())
            })
            .map_err(to_domain_err)
    }
}

// ── History ───────────────────────────────────────────────────────────────────

/// Typed-Diesel implementation of [`HistoryRepository`].
pub struct DieselHistoryRepository {
    db: Db,
}

impl DieselHistoryRepository {
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    fn upsert(&self, entity: &History) -> DomainResult<History> {
        let now = now_iso();
        let row = HistoryRow::from_history(entity, &now);
        self.db
            .with_conn(|conn| {
                diesel::replace_into(history::table)
                    .values(&row)
                    .execute(conn)?;
                Ok(row.into_history())
            })
            .map_err(to_domain_err)
    }
}

impl Repository<History> for DieselHistoryRepository {
    fn list(&self) -> DomainResult<Vec<History>> {
        self.db
            .with_conn(|conn| {
                Ok(history::table
                    .select(HistoryRow::as_select())
                    .load::<HistoryRow>(conn)?
                    .into_iter()
                    .map(HistoryRow::into_history)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn get(&self, id: &str) -> DomainResult<Option<History>> {
        let id = id.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(history::table
                    .find(id)
                    .select(HistoryRow::as_select())
                    .first::<HistoryRow>(conn)
                    .optional()?
                    .map(HistoryRow::into_history))
            })
            .map_err(to_domain_err)
    }

    fn create(&self, entity: &History) -> DomainResult<History> {
        self.upsert(entity)
    }

    fn update(&self, entity: &History) -> DomainResult<History> {
        self.upsert(entity)
    }

    fn delete(&self, id: &str) -> DomainResult<()> {
        let id = id.to_string();
        self.db
            .with_conn(move |conn| {
                diesel::delete(history::table.find(id)).execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }
}

impl HistoryRepository for DieselHistoryRepository {
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<History>> {
        let project_id = project_id.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(history::table
                    .filter(history::project_id.eq(project_id))
                    .select(HistoryRow::as_select())
                    .load::<HistoryRow>(conn)?
                    .into_iter()
                    .map(HistoryRow::into_history)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn save_atomic(&self, history: &History) -> DomainResult<(History, bool)> {
        let now = now_iso();
        let row = HistoryRow::from_history(history, &now);
        self.db
            .transaction(|conn| {
                let existed = history::table
                    .find(row.id.as_str())
                    .select(history::id)
                    .first::<String>(conn)
                    .optional()?
                    .is_some();
                diesel::replace_into(history::table)
                    .values(&row)
                    .execute(conn)?;
                Ok((row.into_history(), !existed))
            })
            .map_err(to_domain_err)
    }
}

// ── Secret keys ───────────────────────────────────────────────────────────────

/// Typed-Diesel implementation of [`SecretKeyRepository`].
pub struct DieselSecretKeyRepository {
    db: Db,
}

impl DieselSecretKeyRepository {
    pub fn new(db: Db) -> Self {
        Self { db }
    }
}

impl SecretKeyRepository for DieselSecretKeyRepository {
    fn register(&self, namespace: &str, name: &str) -> DomainResult<()> {
        // `INSERT OR REPLACE` keyed on the UNIQUE(namespace, name) constraint, so
        // re-registering the same name is idempotent.
        let row = SecretKeyRow {
            id: new_id(),
            namespace: namespace.to_string(),
            name: name.to_string(),
        };
        self.db
            .with_conn(move |conn| {
                diesel::replace_into(secret_keys::table)
                    .values(&row)
                    .execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }

    fn unregister(&self, namespace: &str, name: &str) -> DomainResult<()> {
        let namespace = namespace.to_string();
        let name = name.to_string();
        self.db
            .with_conn(move |conn| {
                diesel::delete(
                    secret_keys::table
                        .filter(secret_keys::namespace.eq(namespace))
                        .filter(secret_keys::name.eq(name)),
                )
                .execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }

    fn list(&self, namespace: &str) -> DomainResult<Vec<String>> {
        let namespace = namespace.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(secret_keys::table
                    .filter(secret_keys::namespace.eq(namespace))
                    .select(secret_keys::name)
                    .load::<String>(conn)?)
            })
            .map_err(to_domain_err)
    }
}
