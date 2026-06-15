//! The Image persistence contract.

use super::image::Image;
use vailabel_core::{DomainResult, Repository};

/// Persistence contract for the `Image` asset: CRUD (via [`Repository`]) plus a
/// typed query for listing a project's images.
pub trait ImageRepository: Repository<Image> {
    /// All images belonging to `project_id`.
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<Image>>;
}
