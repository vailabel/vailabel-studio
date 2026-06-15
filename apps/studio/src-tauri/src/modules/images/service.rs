//! Thin facade over the `vailabel-dataset` image application service.
//!
//! Preserves the original method signatures so `commands.rs` and
//! `AppState.image_service` are unchanged. The per-command `&AppHandle` is now
//! unused (events go through the `EventPublisher` the app service was built
//! with). Domain errors convert to `AppError` via `crate::composition`.

use std::sync::Arc;

use serde_json::Value;

use crate::modules::images::model::{Image, ImageRangePayload, ProjectIdPayload};
use crate::modules::projects::model::EntityIdPayload;
use crate::AppError;
use vailabel_dataset::application::{
    DeleteImageCommand, GetImageQuery, ImageAppService, ListImagesByProjectQuery,
    ListImagesRangeQuery, SaveImageCommand,
};

pub struct ImageService {
    inner: Arc<ImageAppService>,
}

impl ImageService {
    pub fn new(inner: Arc<ImageAppService>) -> Self {
        Self { inner }
    }

    pub fn list_images_by_project(
        &self,
        payload: ProjectIdPayload,
    ) -> Result<Vec<Image>, AppError> {
        Ok(self.inner.list_by_project(ListImagesByProjectQuery {
            project_id: payload.project_id,
        })?)
    }

    pub fn list_images_range(&self, payload: ImageRangePayload) -> Result<Vec<Image>, AppError> {
        Ok(self.inner.list_range(ListImagesRangeQuery {
            project_id: payload.project_id,
            offset: payload.offset,
            limit: payload.limit,
        })?)
    }

    pub fn get_image(&self, payload: EntityIdPayload) -> Result<Image, AppError> {
        Ok(self.inner.get(GetImageQuery::new(payload.id))?)
    }

    pub fn save_image(&self, _app: &tauri::AppHandle, payload: Value) -> Result<Image, AppError> {
        Ok(self.inner.save(SaveImageCommand::new(payload))?)
    }

    pub fn delete_image(
        &self,
        _app: &tauri::AppHandle,
        payload: EntityIdPayload,
    ) -> Result<Value, AppError> {
        Ok(self.inner.delete(DeleteImageCommand::new(payload.id))?)
    }
}
