//! Read-side queries for images.

/// Fetch a single image by id.
pub struct GetImageQuery {
    pub id: String,
}

impl GetImageQuery {
    pub fn new(id: impl Into<String>) -> Self {
        Self { id: id.into() }
    }
}

/// List all images in a project.
pub struct ListImagesByProjectQuery {
    pub project_id: String,
}

/// List one page (offset/limit) of a project's images.
pub struct ListImagesRangeQuery {
    pub project_id: String,
    pub offset: Option<usize>,
    pub limit: Option<usize>,
}
