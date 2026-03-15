use crate::domain::common::service::{
    delete_entity, get_entity, list_entities_by_field, save_entity,
};
use crate::domain::images::model::{Image, ImageRangePayload, ProjectIdPayload};
use crate::domain::images::repository::ImageRepository;
use crate::domain::projects::model::EntityIdPayload;
use crate::AppError;
use serde_json::Value;
use std::sync::Arc;

pub struct ImageService {
    repo: Arc<dyn ImageRepository + Send + Sync>,
}

impl ImageService {
    pub fn new(repo: Arc<dyn ImageRepository + Send + Sync>) -> Self {
        Self { repo }
    }

    pub fn list_images_by_project(
        &self,
        payload: ProjectIdPayload,
    ) -> Result<Vec<Image>, AppError> {
        list_entities_by_field(self.repo.as_ref(), "project_id", &payload.project_id)
    }

    pub fn list_images_range(&self, payload: ImageRangePayload) -> Result<Vec<Image>, AppError> {
        let images = list_entities_by_field(self.repo.as_ref(), "project_id", &payload.project_id)?;
        let offset = payload.offset.unwrap_or(0);
        let limit = payload.limit.unwrap_or(images.len());
        Ok(images.into_iter().skip(offset).take(limit).collect())
    }

    pub fn get_image(&self, payload: EntityIdPayload) -> Result<Image, AppError> {
        get_entity(self.repo.as_ref(), &payload.id, "Image not found")
    }

    pub fn save_image(&self, app: &tauri::AppHandle, payload: Value) -> Result<Image, AppError> {
        save_entity(self.repo.as_ref(), app, "images", payload)
    }

    pub fn delete_image(
        &self,
        app: &tauri::AppHandle,
        payload: EntityIdPayload,
    ) -> Result<Value, AppError> {
        delete_entity::<Image, _>(
            self.repo.as_ref(),
            app,
            "images",
            &payload.id,
            "Image not found",
        )
    }
}
