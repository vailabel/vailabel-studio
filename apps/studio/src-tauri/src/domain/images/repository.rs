use crate::domain::common::repository::{CrudRepository, JsonCrudRepository};
use crate::domain::images::model::Image;
use crate::store::{EntityStore, StoreError};
use std::sync::Arc;

pub trait ImageRepository: CrudRepository<Image> {
    fn list_by_project(&self, project_id: &str) -> Result<Vec<Image>, StoreError> {
        self.list_by_field("project_id", project_id)
    }
}
impl<T> ImageRepository for T where T: CrudRepository<Image> {}

pub struct SqliteImageRepository {
    inner: JsonCrudRepository<Image>,
}

impl SqliteImageRepository {
    pub fn new(store: Arc<dyn EntityStore>) -> Self {
        Self {
            inner: JsonCrudRepository::new(store, "images"),
        }
    }
}

impl CrudRepository<Image> for SqliteImageRepository {
    fn list(&self) -> Result<Vec<Image>, StoreError> {
        self.inner.list()
    }

    fn list_by_field(&self, field: &str, value: &str) -> Result<Vec<Image>, StoreError> {
        self.inner.list_by_field(field, value)
    }

    fn get(&self, id: &str) -> Result<Option<Image>, StoreError> {
        self.inner.get(id)
    }

    fn create(&self, image: &Image) -> Result<Image, StoreError> {
        self.inner.create(image)
    }

    fn update(&self, image: &Image) -> Result<Image, StoreError> {
        self.inner.update(image)
    }

    fn delete(&self, id: &str) -> Result<(), StoreError> {
        self.inner.delete(id)
    }
}
