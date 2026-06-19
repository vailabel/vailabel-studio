//! Read-side queries for items.

/// Fetch a single image by id.
pub struct GetItemQuery {
    pub id: String,
}

impl GetItemQuery {
    pub fn new(id: impl Into<String>) -> Self {
        Self { id: id.into() }
    }
}

/// List all items in a project.
pub struct ListItemsByProjectQuery {
    pub project_id: String,
}

/// List one page (offset/limit) of a project's items.
pub struct ListItemsRangeQuery {
    pub project_id: String,
    pub offset: Option<usize>,
    pub limit: Option<usize>,
}
