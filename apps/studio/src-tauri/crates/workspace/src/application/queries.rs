//! Read-side queries for the workspace aggregates.

/// Fetch a single setting by its unique key.
pub struct GetSettingQuery {
    pub key: String,
}

impl GetSettingQuery {
    pub fn new(key: impl Into<String>) -> Self {
        Self { key: key.into() }
    }
}

/// List all history snapshots in a project.
pub struct ListHistoryByProjectQuery {
    pub project_id: String,
}

impl ListHistoryByProjectQuery {
    pub fn new(project_id: impl Into<String>) -> Self {
        Self {
            project_id: project_id.into(),
        }
    }
}
