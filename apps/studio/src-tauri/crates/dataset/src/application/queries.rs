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

/// One page of a project's items plus the (search-aware) total count, for a
/// server-driven pager / infinite scroll. The page is a real SQL `LIMIT`/`OFFSET`
/// slice — the full dataset is never loaded into memory.
pub struct ListItemsPageQuery {
    pub project_id: String,
    pub offset: usize,
    pub limit: usize,
    /// Optional case-insensitive name filter.
    pub search: Option<String>,
}
