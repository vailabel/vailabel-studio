//! Thin facade over the `vailabel-project` application service.
//!
//! Kept at this path with the original method signatures so the Tauri commands
//! in `commands.rs` and the `AppState.project_service` field are unchanged. It
//! adapts to the crate's [`ProjectAppService`] (which owns the repository and
//! event ports). The per-command `app: &AppHandle` is now unused — event
//! emission goes through the `EventPublisher` the app service was built with at
//! startup (same handle, same `studio://domain-event` wire format). Domain
//! errors convert to `AppError` via the `From` impl in `crate::composition`.
//!
//! Reverting Phase 1 for the project module = restoring this file (and
//! `model.rs`/`repository.rs`) to their prior bodies.

use std::sync::Arc;

use serde_json::Value;

use crate::modules::projects::model::{EntityIdPayload, Project};
use crate::AppError;
use vailabel_project::application::{
    DeleteProjectCommand, GetProjectQuery, ListProjectsQuery, ProjectAppService, SaveProjectCommand,
};

pub struct ProjectService {
    inner: Arc<ProjectAppService>,
}

impl ProjectService {
    pub fn new(inner: Arc<ProjectAppService>) -> Self {
        Self { inner }
    }

    pub fn list_projects(&self) -> Result<Vec<Project>, AppError> {
        Ok(self.inner.list(ListProjectsQuery)?)
    }

    pub fn get_project(&self, payload: EntityIdPayload) -> Result<Project, AppError> {
        Ok(self.inner.get(GetProjectQuery::new(payload.id))?)
    }

    pub fn save_project(
        &self,
        _app: &tauri::AppHandle,
        payload: Value,
    ) -> Result<Project, AppError> {
        Ok(self.inner.save(SaveProjectCommand::new(payload))?)
    }

    pub fn delete_project(
        &self,
        _app: &tauri::AppHandle,
        payload: EntityIdPayload,
    ) -> Result<Value, AppError> {
        Ok(self.inner.delete(DeleteProjectCommand::new(payload.id))?)
    }
}
