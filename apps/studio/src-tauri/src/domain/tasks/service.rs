use crate::domain::common::service::{
    delete_entity, get_entity, list_entities, list_entities_by_field, save_entity,
};
use crate::domain::projects::model::EntityIdPayload;
use crate::domain::tasks::model::{ProjectIdPayload, Task};
use crate::domain::tasks::repository::TaskRepository;
use crate::AppError;
use serde_json::Value;
use std::sync::Arc;

pub struct TaskService {
    repo: Arc<dyn TaskRepository + Send + Sync>,
}

impl TaskService {
    pub fn new(repo: Arc<dyn TaskRepository + Send + Sync>) -> Self {
        Self { repo }
    }

    pub fn list_tasks(&self) -> Result<Vec<Task>, AppError> {
        list_entities(self.repo.as_ref())
    }

    pub fn list_tasks_by_project(&self, payload: ProjectIdPayload) -> Result<Vec<Task>, AppError> {
        list_entities_by_field(self.repo.as_ref(), "project_id", &payload.project_id)
    }

    pub fn get_task(&self, payload: EntityIdPayload) -> Result<Task, AppError> {
        get_entity(self.repo.as_ref(), &payload.id, "Task not found")
    }

    pub fn save_task(&self, app: &tauri::AppHandle, payload: Value) -> Result<Task, AppError> {
        save_entity(self.repo.as_ref(), app, "tasks", payload)
    }

    pub fn delete_task(
        &self,
        app: &tauri::AppHandle,
        payload: EntityIdPayload,
    ) -> Result<Value, AppError> {
        delete_entity::<Task, _>(
            self.repo.as_ref(),
            app,
            "tasks",
            &payload.id,
            "Task not found",
        )
    }
}
