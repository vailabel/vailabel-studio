//! The persistence record for `Image` and its mapping to/from the domain type.

use diesel::prelude::*;

use super::schema::images;
use crate::domain::Image;

/// The `images` table row. `width`/`height` are stored as `Integer` (i32);
/// `flags_json` is a table column the slim `Image` domain type does not carry
/// (it never has — the typed path has always dropped it), so it round-trips as
/// `None`, matching the residual store's behavior.
#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = images)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct ImageRow {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub path: String,
    pub image_path: Option<String>,
    pub width: i32,
    pub height: i32,
    pub flags_json: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl ImageRow {
    /// Build a row for insert/update. Mirrors the residual store's
    /// `image_row_from`: `updated_at` refreshed to `now`, `created_at` preserved
    /// (or `now`), `flags_json` left `None` (the domain type carries no flags).
    pub fn from_image(image: &Image, now: &str) -> Self {
        Self {
            id: image.id.clone(),
            project_id: image.project_id.clone(),
            name: image.name.clone(),
            path: image.path.clone(),
            image_path: image.image_path.clone(),
            width: image.width as i32,
            height: image.height as i32,
            flags_json: None,
            created_at: if image.created_at.is_empty() {
                now.to_string()
            } else {
                image.created_at.clone()
            },
            updated_at: now.to_string(),
        }
    }

    /// Convert a stored row back into the domain `Image` (drops `flags_json`,
    /// matching the typed path).
    pub fn into_image(self) -> Image {
        Image {
            id: self.id,
            name: self.name,
            path: self.path,
            image_path: self.image_path,
            project_id: self.project_id,
            width: self.width as u32,
            height: self.height as u32,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}
