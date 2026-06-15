//! Read-side queries for label classes.

/// Fetch a single label class by id.
pub struct GetLabelQuery {
    pub id: String,
}

impl GetLabelQuery {
    pub fn new(id: impl Into<String>) -> Self {
        Self { id: id.into() }
    }
}

/// List all label classes in a project.
pub struct ListLabelsByProjectQuery {
    pub project_id: String,
}
