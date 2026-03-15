use crate::domain::common::repository::{CrudRepository, JsonCrudRepository};
use crate::domain::projects::model::Project;
use crate::store::{EntityStore, StoreError};
use std::sync::Arc;

pub trait ProjectRepository: CrudRepository<Project> {}
impl<T> ProjectRepository for T where T: CrudRepository<Project> {}

pub struct SqliteProjectRepository {
    inner: JsonCrudRepository<Project>,
}

impl SqliteProjectRepository {
    pub fn new(store: Arc<dyn EntityStore>) -> Self {
        Self {
            inner: JsonCrudRepository::new(store, "projects"),
        }
    }
}

impl CrudRepository<Project> for SqliteProjectRepository {
    fn list(&self) -> Result<Vec<Project>, StoreError> {
        self.inner.list()
    }

    fn list_by_field(&self, field: &str, value: &str) -> Result<Vec<Project>, StoreError> {
        self.inner.list_by_field(field, value)
    }

    fn get(&self, id: &str) -> Result<Option<Project>, StoreError> {
        self.inner.get(id)
    }

    fn create(&self, project: &Project) -> Result<Project, StoreError> {
        self.inner.create(project)
    }

    fn update(&self, project: &Project) -> Result<Project, StoreError> {
        self.inner.update(project)
    }

    fn delete(&self, id: &str) -> Result<(), StoreError> {
        self.inner.delete(id)
    }
}
