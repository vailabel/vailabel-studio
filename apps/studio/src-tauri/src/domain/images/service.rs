use crate::domain::images::model::{Image, ImageRangePayload, ProjectIdPayload};
use crate::domain::images::repository::ImageRepository;
use crate::domain::projects::model::EntityIdPayload;
use crate::emit_domain_event;
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
        Ok(self.repo.list_by_project(&payload.project_id)?)
    }

    pub fn list_images_range(&self, payload: ImageRangePayload) -> Result<Vec<Image>, AppError> {
        let images = self.repo.list_by_project(&payload.project_id)?;
        let offset = payload.offset.unwrap_or(0);
        let limit = payload.limit.unwrap_or(images.len());
        Ok(images.into_iter().skip(offset).take(limit).collect())
    }

    pub fn get_image(&self, payload: EntityIdPayload) -> Result<Image, AppError> {
        self.repo
            .get(&payload.id)?
            .ok_or_else(|| AppError::Message("Image not found".to_string()))
    }

    pub fn save_image(&self, app: &tauri::AppHandle, payload: Value) -> Result<Image, AppError> {
        let image: Image = serde_json::from_value(payload)?;
        let (image, action) = if self.repo.get(&image.id)?.is_some() {
            (self.repo.update(&image)?, "updated")
        } else {
            (self.repo.create(&image)?, "created")
        };
        let image_value = serde_json::to_value(&image)?;
        emit_domain_event(app, "images", action, &image_value)?;
        Ok(image)
    }

    pub fn delete_image(
        &self,
        app: &tauri::AppHandle,
        payload: EntityIdPayload,
    ) -> Result<Value, AppError> {
        let image = self.get_image(payload.clone())?;
        self.repo.delete(&image.id)?;
        let image_value = serde_json::to_value(&image)?;
        emit_domain_event(app, "images", "deleted", &image_value)?;
        Ok(serde_json::json!({ "success": true }))
    }
}
