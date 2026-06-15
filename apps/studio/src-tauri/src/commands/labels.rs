//! Label IPC commands. Thin Tauri handlers over the `vailabel-annotation` label
//! application service (held in [`crate::AppState`]); no business logic here.

use serde_json::Value;
use tauri::State;
use vailabel_annotation::application::{
    DeleteLabelCommand, ListLabelsByProjectQuery, SaveLabelCommand,
};
use vailabel_annotation::contracts::ProjectIdPayload;
use vailabel_project::contracts::EntityIdPayload;

use crate::{AppError, AppState};

#[tauri::command]
pub fn labels_list_by_project(
    state: State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Value, AppError> {
    let labels = state.label_service.list_by_project(ListLabelsByProjectQuery {
        project_id: payload.project_id,
    })?;
    Ok(serde_json::to_value(labels)?)
}

#[tauri::command]
pub fn labels_save(state: State<AppState>, payload: Value) -> Result<Value, AppError> {
    let label = state.label_service.save(SaveLabelCommand::new(payload))?;
    Ok(serde_json::to_value(label)?)
}

#[tauri::command]
pub fn labels_delete(state: State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
    Ok(state
        .label_service
        .delete(DeleteLabelCommand::new(payload.id))?)
}
