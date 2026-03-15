use crate::domain::common::repository::{CrudRepository, JsonCrudRepository};
use crate::domain::tasks::model::Task;
use crate::store::{EntityStore, StoreError};
use std::sync::Arc;

pub trait TaskRepository: CrudRepository<Task> {
    fn list_by_project(&self, project_id: &str) -> Result<Vec<Task>, StoreError> {
        self.list_by_field("project_id", project_id)
    }
}
impl<T> TaskRepository for T where T: CrudRepository<Task> {}

pub struct SqliteTaskRepository {
    inner: JsonCrudRepository<Task>,
}

impl SqliteTaskRepository {
    pub fn new(store: Arc<dyn EntityStore>) -> Self {
        Self {
            inner: JsonCrudRepository::new(store, "tasks"),
        }
    }
}

impl CrudRepository<Task> for SqliteTaskRepository {
    fn list(&self) -> Result<Vec<Task>, StoreError> {
        self.inner.list()
    }

    fn list_by_field(&self, field: &str, value: &str) -> Result<Vec<Task>, StoreError> {
        self.inner.list_by_field(field, value)
    }

    fn get(&self, id: &str) -> Result<Option<Task>, StoreError> {
        self.inner.get(id)
    }

    fn create(&self, task: &Task) -> Result<Task, StoreError> {
        self.inner.create(task)
    }

    fn update(&self, task: &Task) -> Result<Task, StoreError> {
        self.inner.update(task)
    }

    fn delete(&self, id: &str) -> Result<(), StoreError> {
        self.inner.delete(id)
    }
}
