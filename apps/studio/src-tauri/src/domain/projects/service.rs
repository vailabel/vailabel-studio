use crate::domain::projects::model::{EntityIdPayload, Project};
use crate::domain::projects::repository::ProjectRepository;
use crate::emit_domain_event;
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
        Ok(self.repo.list()?)
    }

    pub fn get_project(&self, payload: EntityIdPayload) -> Result<Project, AppError> {
        self.repo
            .get(&payload.id)?
            .ok_or_else(|| AppError::Message("Project not found".to_string()))
    }

    pub fn save_project(
        &self,
        app: &tauri::AppHandle,
        payload: Value,
    ) -> Result<Project, AppError> {
        let project: Project = serde_json::from_value(payload)?;
        let (project, action) = if self.repo.get(&project.id)?.is_some() {
            (self.repo.update(&project)?, "updated")
        } else {
            (self.repo.create(&project)?, "created")
        };
        let project_value = serde_json::to_value(&project)?;
        emit_domain_event(app, "projects", action, &project_value)?;
        Ok(project)
    }

    pub fn delete_project(
        &self,
        app: &tauri::AppHandle,
        payload: EntityIdPayload,
    ) -> Result<Value, AppError> {
        let project = self.get_project(payload)?;
        self.repo.delete(&project.id)?;
        let project_value = serde_json::to_value(&project)?;
        emit_domain_event(app, "projects", "deleted", &project_value)?;
        Ok(serde_json::json!({ "success": true }))
    }
}
