use crate::domain::tasks::model::{Task, ProjectIdPayload};
use crate::domain::tasks::repository::TaskRepository;
use crate::AppError;
use serde_json::Value;
use crate::{emit_domain_event};
use std::sync::Arc;
use crate::domain::projects::model::EntityIdPayload;

pub struct TaskService {
    repo: Arc<dyn TaskRepository + Send + Sync>,
}

impl TaskService {
    pub fn new(repo: Arc<dyn TaskRepository + Send + Sync>) -> Self {
        Self { repo }
    }

    pub fn list_tasks(&self) -> Result<Vec<Task>, AppError> {
        Ok(self.repo.list()?)
    }

    pub fn list_tasks_by_project(&self, payload: ProjectIdPayload) -> Result<Vec<Task>, AppError> {
        Ok(self.repo.list_by_project(&payload.project_id)?)
    }

    pub fn get_task(&self, payload: EntityIdPayload) -> Result<Task, AppError> {
        self.repo
            .get(&payload.id)?
            .ok_or_else(|| AppError::Message("Task not found".to_string()))
    }

    pub fn save_task(
        &self,
        app: &tauri::AppHandle,
        payload: Value,
    ) -> Result<Task, AppError> {
        let task: Task = serde_json::from_value(payload)?;
        let (task, action) = if self.repo.get(&task.id)?.is_some() {
            (self.repo.update(&task)?, "updated")
        } else {
            (self.repo.create(&task)?, "created")
        };
        let task_value = serde_json::to_value(&task)?;
        emit_domain_event(app, "tasks", action, &task_value)?;
        Ok(task)
    }

    pub fn delete_task(
        &self,
        app: &tauri::AppHandle,
        payload: EntityIdPayload,
    ) -> Result<Value, AppError> {
        let task = self.get_task(payload)?;
        self.repo.delete(&task.id)?;
        let task_value = serde_json::to_value(&task)?;
        emit_domain_event(app, "tasks", "deleted", &task_value)?;
        Ok(serde_json::json!({ "success": true }))
    }
}
