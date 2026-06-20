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

/// List all annotations on an image.
pub struct ListAnnotationsByItemQuery {
    pub item_id: String,
}

impl ListAnnotationsByItemQuery {
    pub fn new(item_id: impl Into<String>) -> Self {
        Self {
            item_id: item_id.into(),
        }
    }
}

/// List all annotations in a project.
pub struct ListAnnotationsByProjectQuery {
    pub project_id: String,
}

impl ListAnnotationsByProjectQuery {
    pub fn new(project_id: impl Into<String>) -> Self {
        Self {
            project_id: project_id.into(),
        }
    }
}
