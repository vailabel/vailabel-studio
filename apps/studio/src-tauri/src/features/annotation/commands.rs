//! Annotation-domain IPC commands (labels + annotations) — thin handlers over
//! the `vailabel-annotation` application services in [`crate::AppState`].

use serde::Deserialize;
use serde_json::Value;
use tauri::State;
use vailabel_annotation::application::{
    DeleteAnnotationCommand, DeleteLabelCommand, ListAnnotationsByImageQuery,
    ListAnnotationsByProjectQuery, ListLabelsByProjectQuery, SaveAnnotationCommand, SaveLabelCommand,
};
use vailabel_annotation::contracts::ProjectIdPayload;
use vailabel_project::contracts::EntityIdPayload;

use crate::{AppError, AppState};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageIdPayload {
    pub image_id: String,
}

// ───────────────────────────── Labels ─────────────────────────────

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

// ─────────────────────────── Annotations ───────────────────────────

#[tauri::command]
pub fn annotations_list_by_project(
    state: State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Vec<Value>, AppError> {
    let items = state
        .annotation_service
        .list_by_project(ListAnnotationsByProjectQuery::new(payload.project_id))?;
    Ok(items.iter().map(|a| a.to_value()).collect())
}

#[tauri::command]
pub fn annotations_list_by_image(
    state: State<AppState>,
    payload: ImageIdPayload,
) -> Result<Vec<Value>, AppError> {
    let items = state
        .annotation_service
        .list_by_image(ListAnnotationsByImageQuery::new(payload.image_id))?;
    Ok(items.iter().map(|a| a.to_value()).collect())
}

#[tauri::command]
pub fn annotations_save(state: State<AppState>, payload: Value) -> Result<Value, AppError> {
    let saved = state
        .annotation_service
        .save(SaveAnnotationCommand::new(payload))?;
    Ok(saved.to_value())
}

#[tauri::command]
pub fn annotations_delete(
    state: State<AppState>,
    payload: EntityIdPayload,
) -> Result<Value, AppError> {
    Ok(state
        .annotation_service
        .delete(DeleteAnnotationCommand::new(payload.id))?)
}
