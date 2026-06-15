//! Thin facade over the `vailabel-annotation` label application service.
//!
//! Preserves the original method signatures so `commands.rs` and
//! `AppState.label_service` are unchanged. The per-command `&AppHandle` is now
//! unused (events go through the `EventPublisher` the app service was built
//! with). Domain errors convert to `AppError` via `crate::composition`.

use std::sync::Arc;

use serde_json::Value;

use crate::modules::labels::model::{Label, ProjectIdPayload};
use crate::modules::projects::model::EntityIdPayload;
use crate::AppError;
use vailabel_annotation::application::{
    DeleteLabelCommand, GetLabelQuery, LabelClassAppService, ListLabelsByProjectQuery,
    SaveLabelCommand,
};

pub struct LabelService {
    inner: Arc<LabelClassAppService>,
}

impl LabelService {
    pub fn new(inner: Arc<LabelClassAppService>) -> Self {
        Self { inner }
    }

    pub fn list_labels_by_project(
        &self,
        payload: ProjectIdPayload,
    ) -> Result<Vec<Label>, AppError> {
        Ok(self.inner.list_by_project(ListLabelsByProjectQuery {
            project_id: payload.project_id,
        })?)
    }

    pub fn get_label(&self, payload: EntityIdPayload) -> Result<Label, AppError> {
        Ok(self.inner.get(GetLabelQuery::new(payload.id))?)
    }

    pub fn save_label(&self, _app: &tauri::AppHandle, payload: Value) -> Result<Label, AppError> {
        Ok(self.inner.save(SaveLabelCommand::new(payload))?)
    }

    pub fn delete_label(
        &self,
        _app: &tauri::AppHandle,
        payload: EntityIdPayload,
    ) -> Result<Value, AppError> {
        Ok(self.inner.delete(DeleteLabelCommand::new(payload.id))?)
    }
}
