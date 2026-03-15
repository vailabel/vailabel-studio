use crate::domain::tasks::model::Task;
use crate::store::{Store, StoreError};
use serde_json;
use std::sync::Arc;

pub trait TaskRepository {
    fn list(&self) -> Result<Vec<Task>, StoreError>;
    fn list_by_project(&self, project_id: &str) -> Result<Vec<Task>, StoreError>;
    fn get(&self, id: &str) -> Result<Option<Task>, StoreError>;
    fn create(&self, task: &Task) -> Result<Task, StoreError>;
    fn update(&self, task: &Task) -> Result<Task, StoreError>;
    fn delete(&self, id: &str) -> Result<(), StoreError>;
}

pub struct SqliteTaskRepository {
    store: Arc<dyn Store>,
}

impl SqliteTaskRepository {
    pub fn new(store: Arc<dyn Store>) -> Self {
        Self { store }
    }
}

impl TaskRepository for SqliteTaskRepository {
    fn list(&self) -> Result<Vec<Task>, StoreError> {
        let values = self.store.list_entities("tasks")?;
        let tasks = values
            .into_iter()
            .map(|v| serde_json::from_value(v).map_err(StoreError::Json))
            .collect::<Result<Vec<Task>, StoreError>>()?;
        Ok(tasks)
    }

    fn list_by_project(&self, project_id: &str) -> Result<Vec<Task>, StoreError> {
        let values = self
            .store
            .list_by_field("tasks", "project_id", project_id)?;
        let tasks = values
            .into_iter()
            .map(|v| serde_json::from_value(v).map_err(StoreError::Json))
            .collect::<Result<Vec<Task>, StoreError>>()?;
        Ok(tasks)
    }

    fn get(&self, id: &str) -> Result<Option<Task>, StoreError> {
        let value = self.store.get_entity("tasks", id)?;
        match value {
            Some(v) => {
                let task = serde_json::from_value(v).map_err(StoreError::Json)?;
                Ok(Some(task))
            }
            None => Ok(None),
        }
    }

    fn create(&self, task: &Task) -> Result<Task, StoreError> {
        let value = serde_json::to_value(task).map_err(StoreError::Json)?;
        let saved_value = self.store.upsert_entity("tasks", value)?;
        let saved_task = serde_json::from_value(saved_value).map_err(StoreError::Json)?;
        Ok(saved_task)
    }

    fn update(&self, task: &Task) -> Result<Task, StoreError> {
        let value = serde_json::to_value(task).map_err(StoreError::Json)?;
        let saved_value = self.store.upsert_entity("tasks", value)?;
        let saved_task = serde_json::from_value(saved_value).map_err(StoreError::Json)?;
        Ok(saved_task)
    }

    fn delete(&self, id: &str) -> Result<(), StoreError> {
        self.store.delete_entity("tasks", id)
    }
}
