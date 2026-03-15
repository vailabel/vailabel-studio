use crate::domain::images::model::Image;
use crate::store::{Store, StoreError};
use serde_json;
use std::sync::Arc;

pub trait ImageRepository {
    fn list_by_project(&self, project_id: &str) -> Result<Vec<Image>, StoreError>;
    fn get(&self, id: &str) -> Result<Option<Image>, StoreError>;
    fn create(&self, image: &Image) -> Result<Image, StoreError>;
    fn update(&self, image: &Image) -> Result<Image, StoreError>;
    fn delete(&self, id: &str) -> Result<(), StoreError>;
}

pub struct SqliteImageRepository {
    store: Arc<dyn Store>,
}

impl SqliteImageRepository {
    pub fn new(store: Arc<dyn Store>) -> Self {
        Self { store }
    }
}

impl ImageRepository for SqliteImageRepository {
    fn list_by_project(&self, project_id: &str) -> Result<Vec<Image>, StoreError> {
        let values = self.store.list_by_field("images", "project_id", project_id)?;
        let images = values
            .into_iter()
            .map(|v| serde_json::from_value(v).map_err(StoreError::Json))
            .collect::<Result<Vec<Image>, StoreError>>()?;
        Ok(images)
    }

    fn get(&self, id: &str) -> Result<Option<Image>, StoreError> {
        let value = self.store.get_entity("images", id)?;
        match value {
            Some(v) => {
                let image = serde_json::from_value(v).map_err(StoreError::Json)?;
                Ok(Some(image))
            }
            None => Ok(None),
        }
    }

    fn create(&self, image: &Image) -> Result<Image, StoreError> {
        let value = serde_json::to_value(image).map_err(StoreError::Json)?;
        let saved_value = self.store.upsert_entity("images", value)?;
        let saved_image = serde_json::from_value(saved_value).map_err(StoreError::Json)?;
        Ok(saved_image)
    }

    fn update(&self, image: &Image) -> Result<Image, StoreError> {
        let value = serde_json::to_value(image).map_err(StoreError::Json)?;
        let saved_value = self.store.upsert_entity("images", value)?;
        let saved_image = serde_json::from_value(saved_value).map_err(StoreError::Json)?;
        Ok(saved_image)
    }

    fn delete(&self, id: &str) -> Result<(), StoreError> {
        self.store.delete_entity("images", id)
    }
}
