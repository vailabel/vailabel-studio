use crate::domain::common::service::{delete_entity, get_entity, list_entities, save_entity};
use crate::domain::projects::model::{EntityIdPayload, Project};
use crate::domain::projects::repository::ProjectRepository;
use crate::AppError;
use serde_json::Value;
use std::sync::Arc;

pub struct ProjectService {
    repo: Arc<dyn ProjectRepository + Send + Sync>,
}

impl ProjectService {
    pub fn new(repo: Arc<dyn ProjectRepository + Send + Sync>) -> Self {
        Self { repo }
    }

    pub fn list_projects(&self) -> Result<Vec<Project>, AppError> {
        list_entities(self.repo.as_ref())
    }

    pub fn get_project(&self, payload: EntityIdPayload) -> Result<Project, AppError> {
        get_entity(self.repo.as_ref(), &payload.id, "Project not found")
    }

    pub fn save_project(
        &self,
        app: &tauri::AppHandle,
        payload: Value,
    ) -> Result<Project, AppError> {
        save_entity(self.repo.as_ref(), app, "projects", payload)
    }

    pub fn delete_project(
        &self,
        app: &tauri::AppHandle,
        payload: EntityIdPayload,
    ) -> Result<Value, AppError> {
        delete_entity::<Project, _>(
            self.repo.as_ref(),
            app,
            "projects",
            &payload.id,
            "Project not found",
        )
    }
}
