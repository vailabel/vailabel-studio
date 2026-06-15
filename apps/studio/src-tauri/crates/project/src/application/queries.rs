//! Read-side queries.

/// List all projects.
pub struct ListProjectsQuery;

/// Fetch a single project by id.
pub struct GetProjectQuery {
    /// Id of the project to fetch.
    pub id: String,
}

impl GetProjectQuery {
    /// Target a project id.
    pub fn new(id: impl Into<String>) -> Self {
        Self { id: id.into() }
    }
}
