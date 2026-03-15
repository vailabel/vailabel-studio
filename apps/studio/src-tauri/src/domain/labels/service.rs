use crate::domain::common::service::{
    delete_entity, get_entity, list_entities_by_field, save_entity,
};
use crate::domain::labels::model::{Label, ProjectIdPayload};
use crate::domain::labels::repository::LabelRepository;
use crate::domain::projects::model::EntityIdPayload;
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
        list_entities_by_field(self.repo.as_ref(), "project_id", &payload.project_id)
    }

    pub fn get_label(&self, payload: EntityIdPayload) -> Result<Label, AppError> {
        get_entity(self.repo.as_ref(), &payload.id, "Label not found")
    }

    pub fn save_label(&self, app: &tauri::AppHandle, payload: Value) -> Result<Label, AppError> {
        save_entity(self.repo.as_ref(), app, "labels", payload)
    }

    pub fn delete_label(
        &self,
        app: &tauri::AppHandle,
        payload: EntityIdPayload,
    ) -> Result<Value, AppError> {
        delete_entity::<Label, _>(
            self.repo.as_ref(),
            app,
            "labels",
            &payload.id,
            "Label not found",
        )
    }
}
