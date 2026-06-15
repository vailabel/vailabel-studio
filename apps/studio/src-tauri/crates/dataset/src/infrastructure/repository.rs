//! The `Image` repository, backed by typed Diesel queries over the shared
//! `vailabel-db` connection.

use diesel::prelude::*;
use vailabel_core::{DomainError, DomainResult, Repository};
use vailabel_db::{Db, DbError};
use vailabel_shared::now_iso;

use super::record::ImageRow;
use super::schema::images;
use crate::domain::{Image, ImageRepository};

/// Typed-Diesel implementation of [`ImageRepository`].
pub struct DieselImageRepository {
    db: Db,
}

impl DieselImageRepository {
    /// Build the repository over the shared connection handle.
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    fn upsert(&self, entity: &Image) -> DomainResult<Image> {
        let now = now_iso();
        let row = ImageRow::from_image(entity, &now);
        self.db
            .with_conn(|conn| {
                diesel::replace_into(images::table)
                    .values(&row)
                    .execute(conn)?;
                Ok(row.into_image())
            })
            .map_err(to_domain_err)
    }
}

fn to_domain_err(err: DbError) -> DomainError {
    DomainError::repository(err.to_string())
}

impl Repository<Image> for DieselImageRepository {
    fn list(&self) -> DomainResult<Vec<Image>> {
        self.db
            .with_conn(|conn| {
                Ok(images::table
                    .select(ImageRow::as_select())
                    .load::<ImageRow>(conn)?
                    .into_iter()
                    .map(ImageRow::into_image)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn get(&self, id: &str) -> DomainResult<Option<Image>> {
        self.db
            .with_conn(|conn| {
                Ok(images::table
                    .find(id)
                    .select(ImageRow::as_select())
                    .first::<ImageRow>(conn)
                    .optional()?
                    .map(ImageRow::into_image))
            })
            .map_err(to_domain_err)
    }

    fn create(&self, entity: &Image) -> DomainResult<Image> {
        self.upsert(entity)
    }

    fn update(&self, entity: &Image) -> DomainResult<Image> {
        self.upsert(entity)
    }

    fn delete(&self, id: &str) -> DomainResult<()> {
        self.db
            .with_conn(|conn| {
                diesel::delete(images::table.find(id)).execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }
}

impl ImageRepository for DieselImageRepository {
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<Image>> {
        let project_id = project_id.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(images::table
                    .filter(images::project_id.eq(project_id))
                    .select(ImageRow::as_select())
                    .load::<ImageRow>(conn)?
                    .into_iter()
                    .map(ImageRow::into_image)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn save_atomic(&self, image: &Image) -> DomainResult<(Image, bool)> {
        let now = now_iso();
        let row = ImageRow::from_image(image, &now);
        self.db
            .transaction(|conn| {
                let existed = images::table
                    .find(row.id.as_str())
                    .select(images::id)
                    .first::<String>(conn)
                    .optional()?
                    .is_some();
                diesel::replace_into(images::table)
                    .values(&row)
                    .execute(conn)?;
                Ok((row.into_image(), !existed))
            })
            .map_err(to_domain_err)
    }

    fn delete_returning(&self, id: &str) -> DomainResult<Option<Image>> {
        let id = id.to_string();
        self.db
            .transaction(move |conn| {
                let row = images::table
                    .find(id.as_str())
                    .select(ImageRow::as_select())
                    .first::<ImageRow>(conn)
                    .optional()?;
                match row {
                    Some(row) => {
                        diesel::delete(images::table.find(id.as_str())).execute(conn)?;
                        Ok(Some(row.into_image()))
                    }
                    None => Ok(None),
                }
            })
            .map_err(to_domain_err)
    }
}
