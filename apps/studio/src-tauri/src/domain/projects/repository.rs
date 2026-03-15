use crate::domain::projects::model::Project;
use crate::store::{Store, StoreError};
use serde_json;
use std::sync::Arc;

pub trait ProjectRepository {
    fn list(&self) -> Result<Vec<Project>, StoreError>;
    fn get(&self, id: &str) -> Result<Option<Project>, StoreError>;
    fn create(&self, project: &Project) -> Result<Project, StoreError>;
    fn update(&self, project: &Project) -> Result<Project, StoreError>;
    fn delete(&self, id: &str) -> Result<(), StoreError>;
}

pub struct SqliteProjectRepository {
    store: Arc<dyn Store>,
}

impl SqliteProjectRepository {
    pub fn new(store: Arc<dyn Store>) -> Self {
        Self { store }
    }
}

impl ProjectRepository for SqliteProjectRepository {
    fn list(&self) -> Result<Vec<Project>, StoreError> {
        let values = self.store.list_entities("projects")?;
        let projects = values
            .into_iter()
            .map(|v| serde_json::from_value(v).map_err(StoreError::Json))
            .collect::<Result<Vec<Project>, StoreError>>()?;
        Ok(projects)
    }

    fn get(&self, id: &str) -> Result<Option<Project>, StoreError> {
        let value = self.store.get_entity("projects", id)?;
        match value {
            Some(v) => {
                let project = serde_json::from_value(v).map_err(StoreError::Json)?;
                Ok(Some(project))
            }
            None => Ok(None),
        }
    }

    fn create(&self, project: &Project) -> Result<Project, StoreError> {
        let value = serde_json::to_value(project).map_err(StoreError::Json)?;
        let saved_value = self.store.upsert_entity("projects", value)?;
        let saved_project = serde_json::from_value(saved_value).map_err(StoreError::Json)?;
        Ok(saved_project)
    }

    fn update(&self, project: &Project) -> Result<Project, StoreError> {
        let value = serde_json::to_value(project).map_err(StoreError::Json)?;
        let saved_value = self.store.upsert_entity("projects", value)?;
        let saved_project = serde_json::from_value(saved_value).map_err(StoreError::Json)?;
        Ok(saved_project)
    }

    fn delete(&self, id: &str) -> Result<(), StoreError> {
        self.store.delete_entity("projects", id)
    }
}
