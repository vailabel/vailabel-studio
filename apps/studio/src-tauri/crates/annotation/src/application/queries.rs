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
pub struct ListAnnotationsByImageQuery {
    pub image_id: String,
}

impl ListAnnotationsByImageQuery {
    pub fn new(image_id: impl Into<String>) -> Self {
        Self {
            image_id: image_id.into(),
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
