//! The Image persistence contract.

use super::image::Image;
use vailabel_core::{DomainResult, Repository};

/// Persistence contract for the `Image` asset: CRUD (via [`Repository`]), a typed
/// list-by-project query, and atomic single-transaction save/delete used by the
/// application layer.
pub trait ImageRepository: Repository<Image> {
    /// All images belonging to `project_id`.
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<Image>>;

    /// Create-or-update in one transaction; returns the stored image and whether
    /// it was newly created (`true`) vs updated (`false`).
    fn save_atomic(&self, image: &Image) -> DomainResult<(Image, bool)>;

    /// Delete in one transaction, returning the prior value (or `None`).
    fn delete_returning(&self, id: &str) -> DomainResult<Option<Image>>;
}
