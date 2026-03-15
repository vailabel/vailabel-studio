use crate::domain::labels::model::Label;
use crate::store::{Store, StoreError};
use serde_json;
use std::sync::Arc;

pub trait LabelRepository {
    fn list_by_project(&self, project_id: &str) -> Result<Vec<Label>, StoreError>;
    fn get(&self, id: &str) -> Result<Option<Label>, StoreError>;
    fn create(&self, label: &Label) -> Result<Label, StoreError>;
    fn update(&self, label: &Label) -> Result<Label, StoreError>;
    fn delete(&self, id: &str) -> Result<(), StoreError>;
}

pub struct SqliteLabelRepository {
    store: Arc<dyn Store>,
}

impl SqliteLabelRepository {
    pub fn new(store: Arc<dyn Store>) -> Self {
        Self { store }
    }
}

impl LabelRepository for SqliteLabelRepository {
    fn list_by_project(&self, project_id: &str) -> Result<Vec<Label>, StoreError> {
        let values = self.store.list_by_field("labels", "project_id", project_id)?;
        let labels = values
            .into_iter()
            .map(|v| serde_json::from_value(v).map_err(StoreError::Json))
            .collect::<Result<Vec<Label>, StoreError>>()?;
        Ok(labels)
    }

    fn get(&self, id: &str) -> Result<Option<Label>, StoreError> {
        let value = self.store.get_entity("labels", id)?;
        match value {
            Some(v) => {
                let label = serde_json::from_value(v).map_err(StoreError::Json)?;
                Ok(Some(label))
            }
            None => Ok(None),
        }
    }

    fn create(&self, label: &Label) -> Result<Label, StoreError> {
        let value = serde_json::to_value(label).map_err(StoreError::Json)?;
        let saved_value = self.store.upsert_entity("labels", value)?;
        let saved_label = serde_json::from_value(saved_value).map_err(StoreError::Json)?;
        Ok(saved_label)
    }

    fn update(&self, label: &Label) -> Result<Label, StoreError> {
        let value = serde_json::to_value(label).map_err(StoreError::Json)?;
        let saved_value = self.store.upsert_entity("labels", value)?;
        let saved_label = serde_json::from_value(saved_value).map_err(StoreError::Json)?;
        Ok(saved_label)
    }

    fn delete(&self, id: &str) -> Result<(), StoreError> {
        self.store.delete_entity("labels", id)
    }
}
