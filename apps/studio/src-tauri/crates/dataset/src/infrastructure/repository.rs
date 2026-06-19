//! The `Item` repository, backed by typed Diesel queries over the shared
//! `vailabel-db` connection.

use diesel::prelude::*;
use vailabel_core::{DomainError, DomainResult, Repository};
use vailabel_db::{Db, DbError};
use vailabel_shared::now_iso;

use super::record::ItemRow;
use super::schema::items;
use crate::domain::{Item, ItemRepository};

/// Typed-Diesel implementation of [`ItemRepository`].
pub struct DieselItemRepository {
    db: Db,
}

impl DieselItemRepository {
    /// Build the repository over the shared connection handle.
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    fn upsert(&self, entity: &Item) -> DomainResult<Item> {
        let now = now_iso();
        let row = ItemRow::from_item(entity, &now);
        self.db
            .with_conn(|conn| {
                diesel::replace_into(items::table)
                    .values(&row)
                    .execute(conn)?;
                Ok(row.into_item())
            })
            .map_err(to_domain_err)
    }
}

fn to_domain_err(err: DbError) -> DomainError {
    DomainError::repository(err.to_string())
}

impl Repository<Item> for DieselItemRepository {
    fn list(&self) -> DomainResult<Vec<Item>> {
        self.db
            .with_conn(|conn| {
                Ok(items::table
                    .select(ItemRow::as_select())
                    .load::<ItemRow>(conn)?
                    .into_iter()
                    .map(ItemRow::into_item)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn get(&self, id: &str) -> DomainResult<Option<Item>> {
        self.db
            .with_conn(|conn| {
                Ok(items::table
                    .find(id)
                    .select(ItemRow::as_select())
                    .first::<ItemRow>(conn)
                    .optional()?
                    .map(ItemRow::into_item))
            })
            .map_err(to_domain_err)
    }

    fn create(&self, entity: &Item) -> DomainResult<Item> {
        self.upsert(entity)
    }

    fn update(&self, entity: &Item) -> DomainResult<Item> {
        self.upsert(entity)
    }

    fn delete(&self, id: &str) -> DomainResult<()> {
        self.db
            .with_conn(|conn| {
                diesel::delete(items::table.find(id)).execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }
}

impl ItemRepository for DieselItemRepository {
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<Item>> {
        let project_id = project_id.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(items::table
                    .filter(items::project_id.eq(project_id))
                    .select(ItemRow::as_select())
                    .load::<ItemRow>(conn)?
                    .into_iter()
                    .map(ItemRow::into_item)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn save_atomic(&self, image: &Item) -> DomainResult<(Item, bool)> {
        let now = now_iso();
        let row = ItemRow::from_item(image, &now);
        self.db
            .transaction(|conn| {
                let existed = items::table
                    .find(row.id.as_str())
                    .select(items::id)
                    .first::<String>(conn)
                    .optional()?
                    .is_some();
                diesel::replace_into(items::table)
                    .values(&row)
                    .execute(conn)?;
                Ok((row.into_item(), !existed))
            })
            .map_err(to_domain_err)
    }

    fn delete_returning(&self, id: &str) -> DomainResult<Option<Item>> {
        let id = id.to_string();
        self.db
            .transaction(move |conn| {
                let row = items::table
                    .find(id.as_str())
                    .select(ItemRow::as_select())
                    .first::<ItemRow>(conn)
                    .optional()?;
                match row {
                    Some(row) => {
                        diesel::delete(items::table.find(id.as_str())).execute(conn)?;
                        Ok(Some(row.into_item()))
                    }
                    None => Ok(None),
                }
            })
            .map_err(to_domain_err)
    }
}
