use crate::domain::common::repository::{CrudRepository, JsonCrudRepository};
use crate::domain::labels::model::Label;
use crate::store::{EntityStore, StoreError};
use std::sync::Arc;

pub trait LabelRepository: CrudRepository<Label> {
    fn list_by_project(&self, project_id: &str) -> Result<Vec<Label>, StoreError> {
        self.list_by_field("project_id", project_id)
    }
}
impl<T> LabelRepository for T where T: CrudRepository<Label> {}

pub struct SqliteLabelRepository {
    inner: JsonCrudRepository<Label>,
}

impl SqliteLabelRepository {
    pub fn new(store: Arc<dyn EntityStore>) -> Self {
        Self {
            inner: JsonCrudRepository::new(store, "labels"),
        }
    }
}

impl CrudRepository<Label> for SqliteLabelRepository {
    fn list(&self) -> Result<Vec<Label>, StoreError> {
        self.inner.list()
    }

    fn list_by_field(&self, field: &str, value: &str) -> Result<Vec<Label>, StoreError> {
        self.inner.list_by_field(field, value)
    }

    fn get(&self, id: &str) -> Result<Option<Label>, StoreError> {
        self.inner.get(id)
    }

    fn create(&self, label: &Label) -> Result<Label, StoreError> {
        self.inner.create(label)
    }

    fn update(&self, label: &Label) -> Result<Label, StoreError> {
        self.inner.update(label)
    }

    fn delete(&self, id: &str) -> Result<(), StoreError> {
        self.inner.delete(id)
    }
}
