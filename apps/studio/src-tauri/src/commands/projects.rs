//! Project IPC commands. Thin Tauri handlers over the `vailabel-project`
//! application service (held in [`crate::AppState`]); no business logic here.

use serde_json::Value;
use tauri::State;
use vailabel_project::application::{
    DeleteProjectCommand, GetProjectQuery, ListProjectsQuery, SaveProjectCommand,
};
use vailabel_project::contracts::EntityIdPayload;

use crate::{AppError, AppState};

#[tauri::command]
pub fn projects_list(state: State<AppState>) -> Result<Value, AppError> {
    let projects = state.project_service.list(ListProjectsQuery)?;
    Ok(serde_json::to_value(projects)?)
}

#[tauri::command]
pub fn projects_get(state: State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
    let project = state.project_service.get(GetProjectQuery::new(payload.id))?;
    Ok(serde_json::to_value(project)?)
}

#[tauri::command]
pub fn projects_save(state: State<AppState>, payload: Value) -> Result<Value, AppError> {
    let project = state.project_service.save(SaveProjectCommand::new(payload))?;
    Ok(serde_json::to_value(project)?)
}

#[tauri::command]
pub fn projects_delete(
    state: State<AppState>,
    payload: EntityIdPayload,
) -> Result<Value, AppError> {
    Ok(state
        .project_service
        .delete(DeleteProjectCommand::new(payload.id))?)
}
