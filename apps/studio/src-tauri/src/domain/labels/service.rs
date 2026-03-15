use crate::domain::labels::model::{Label, ProjectIdPayload};
use crate::domain::labels::repository::LabelRepository;
use crate::domain::projects::model::EntityIdPayload;
use crate::emit_domain_event;
use crate::AppError;
use serde_json::Value;
use std::sync::Arc;

pub struct LabelService {
    repo: Arc<dyn LabelRepository + Send + Sync>,
}

impl LabelService {
    pub fn new(repo: Arc<dyn LabelRepository + Send + Sync>) -> Self {
        Self { repo }
    }

    pub fn list_labels_by_project(
        &self,
        payload: ProjectIdPayload,
    ) -> Result<Vec<Label>, AppError> {
        Ok(self.repo.list_by_project(&payload.project_id)?)
    }

    pub fn get_label(&self, payload: EntityIdPayload) -> Result<Label, AppError> {
        self.repo
            .get(&payload.id)?
            .ok_or_else(|| AppError::Message("Label not found".to_string()))
    }

    pub fn save_label(&self, app: &tauri::AppHandle, payload: Value) -> Result<Label, AppError> {
        let label: Label = serde_json::from_value(payload)?;
        let (label, action) = if self.repo.get(&label.id)?.is_some() {
            (self.repo.update(&label)?, "updated")
        } else {
            (self.repo.create(&label)?, "created")
        };
        let label_value = serde_json::to_value(&label)?;
        emit_domain_event(app, "labels", action, &label_value)?;
        Ok(label)
    }

    pub fn delete_label(
        &self,
        app: &tauri::AppHandle,
        payload: EntityIdPayload,
    ) -> Result<Value, AppError> {
        let label = self.get_label(payload)?;
        self.repo.delete(&label.id)?;
        let label_value = serde_json::to_value(&label)?;
        emit_domain_event(app, "labels", "deleted", &label_value)?;
        Ok(serde_json::json!({ "success": true }))
    }
}
