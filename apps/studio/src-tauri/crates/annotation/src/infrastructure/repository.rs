//! The `LabelClass` repository, backed by typed Diesel queries over the shared
//! `vailabel-db` connection.

use diesel::prelude::*;
use vailabel_core::{DomainError, DomainResult, Repository};
use vailabel_db::{Db, DbError};
use vailabel_shared::now_iso;

use super::record::{AnnotationRow, LabelRow, PredictionRow};
use super::schema::{annotations, labels, predictions};
use crate::domain::{
    Annotation, AnnotationRepository, LabelClass, LabelRepository, Prediction, PredictionRepository,
};

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

// ── Annotations ───────────────────────────────────────────────────────────────

/// Typed-Diesel implementation of [`AnnotationRepository`].
pub struct DieselAnnotationRepository {
    db: Db,
}

impl DieselAnnotationRepository {
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    fn upsert(&self, entity: &Annotation) -> DomainResult<Annotation> {
        let now = now_iso();
        let row = AnnotationRow::from_annotation(entity, &now);
        self.db
            .with_conn(|conn| {
                diesel::replace_into(annotations::table)
                    .values(&row)
                    .execute(conn)?;
                Ok(row.into_annotation())
            })
            .map_err(to_domain_err)
    }
}

impl Repository<Annotation> for DieselAnnotationRepository {
    fn list(&self) -> DomainResult<Vec<Annotation>> {
        self.db
            .with_conn(|conn| {
                Ok(annotations::table
                    .select(AnnotationRow::as_select())
                    .load::<AnnotationRow>(conn)?
                    .into_iter()
                    .map(AnnotationRow::into_annotation)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn get(&self, id: &str) -> DomainResult<Option<Annotation>> {
        let id = id.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(annotations::table
                    .find(id)
                    .select(AnnotationRow::as_select())
                    .first::<AnnotationRow>(conn)
                    .optional()?
                    .map(AnnotationRow::into_annotation))
            })
            .map_err(to_domain_err)
    }

    fn create(&self, entity: &Annotation) -> DomainResult<Annotation> {
        self.upsert(entity)
    }

    fn update(&self, entity: &Annotation) -> DomainResult<Annotation> {
        self.upsert(entity)
    }

    fn delete(&self, id: &str) -> DomainResult<()> {
        let id = id.to_string();
        self.db
            .with_conn(move |conn| {
                diesel::delete(annotations::table.find(id)).execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }
}

impl AnnotationRepository for DieselAnnotationRepository {
    fn list_by_image(&self, image_id: &str) -> DomainResult<Vec<Annotation>> {
        let image_id = image_id.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(annotations::table
                    .filter(annotations::image_id.eq(image_id))
                    .select(AnnotationRow::as_select())
                    .load::<AnnotationRow>(conn)?
                    .into_iter()
                    .map(AnnotationRow::into_annotation)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<Annotation>> {
        let project_id = project_id.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(annotations::table
                    .filter(annotations::project_id.eq(project_id))
                    .select(AnnotationRow::as_select())
                    .load::<AnnotationRow>(conn)?
                    .into_iter()
                    .map(AnnotationRow::into_annotation)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn save_atomic(&self, annotation: &Annotation) -> DomainResult<(Annotation, bool)> {
        let now = now_iso();
        let row = AnnotationRow::from_annotation(annotation, &now);
        self.db
            .transaction(|conn| {
                let existed = annotations::table
                    .find(row.id.as_str())
                    .select(annotations::id)
                    .first::<String>(conn)
                    .optional()?
                    .is_some();
                diesel::replace_into(annotations::table)
                    .values(&row)
                    .execute(conn)?;
                Ok((row.into_annotation(), !existed))
            })
            .map_err(to_domain_err)
    }

    fn delete_returning(&self, id: &str) -> DomainResult<Option<Annotation>> {
        let id = id.to_string();
        self.db
            .transaction(move |conn| {
                let row = annotations::table
                    .find(id.as_str())
                    .select(AnnotationRow::as_select())
                    .first::<AnnotationRow>(conn)
                    .optional()?;
                match row {
                    Some(row) => {
                        diesel::delete(annotations::table.find(id.as_str())).execute(conn)?;
                        Ok(Some(row.into_annotation()))
                    }
                    None => Ok(None),
                }
            })
            .map_err(to_domain_err)
    }
}

// ── Predictions ───────────────────────────────────────────────────────────────

/// Typed-Diesel implementation of [`PredictionRepository`].
pub struct DieselPredictionRepository {
    db: Db,
}

impl DieselPredictionRepository {
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    fn upsert(&self, entity: &Prediction) -> DomainResult<Prediction> {
        let now = now_iso();
        let row = PredictionRow::from_prediction(entity, &now);
        self.db
            .with_conn(|conn| {
                diesel::replace_into(predictions::table)
                    .values(&row)
                    .execute(conn)?;
                Ok(row.into_prediction())
            })
            .map_err(to_domain_err)
    }
}

impl Repository<Prediction> for DieselPredictionRepository {
    fn list(&self) -> DomainResult<Vec<Prediction>> {
        self.db
            .with_conn(|conn| {
                Ok(predictions::table
                    .select(PredictionRow::as_select())
                    .load::<PredictionRow>(conn)?
                    .into_iter()
                    .map(PredictionRow::into_prediction)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn get(&self, id: &str) -> DomainResult<Option<Prediction>> {
        let id = id.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(predictions::table
                    .find(id)
                    .select(PredictionRow::as_select())
                    .first::<PredictionRow>(conn)
                    .optional()?
                    .map(PredictionRow::into_prediction))
            })
            .map_err(to_domain_err)
    }

    fn create(&self, entity: &Prediction) -> DomainResult<Prediction> {
        self.upsert(entity)
    }

    fn update(&self, entity: &Prediction) -> DomainResult<Prediction> {
        self.upsert(entity)
    }

    fn delete(&self, id: &str) -> DomainResult<()> {
        let id = id.to_string();
        self.db
            .with_conn(move |conn| {
                diesel::delete(predictions::table.find(id)).execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }
}

impl PredictionRepository for DieselPredictionRepository {
    fn list_by_image(&self, image_id: &str) -> DomainResult<Vec<Prediction>> {
        let image_id = image_id.to_string();
        self.db
            .with_conn(move |conn| {
                Ok(predictions::table
                    .filter(predictions::image_id.eq(image_id))
                    .select(PredictionRow::as_select())
                    .load::<PredictionRow>(conn)?
                    .into_iter()
                    .map(PredictionRow::into_prediction)
                    .collect())
            })
            .map_err(to_domain_err)
    }

    fn save_atomic(&self, prediction: &Prediction) -> DomainResult<(Prediction, bool)> {
        let now = now_iso();
        let row = PredictionRow::from_prediction(prediction, &now);
        self.db
            .transaction(|conn| {
                let existed = predictions::table
                    .find(row.id.as_str())
                    .select(predictions::id)
                    .first::<String>(conn)
                    .optional()?
                    .is_some();
                diesel::replace_into(predictions::table)
                    .values(&row)
                    .execute(conn)?;
                Ok((row.into_prediction(), !existed))
            })
            .map_err(to_domain_err)
    }

    fn delete_returning(&self, id: &str) -> DomainResult<Option<Prediction>> {
        let id = id.to_string();
        self.db
            .transaction(move |conn| {
                let row = predictions::table
                    .find(id.as_str())
                    .select(PredictionRow::as_select())
                    .first::<PredictionRow>(conn)
                    .optional()?;
                match row {
                    Some(row) => {
                        diesel::delete(predictions::table.find(id.as_str())).execute(conn)?;
                        Ok(Some(row.into_prediction()))
                    }
                    None => Ok(None),
                }
            })
            .map_err(to_domain_err)
    }
}
