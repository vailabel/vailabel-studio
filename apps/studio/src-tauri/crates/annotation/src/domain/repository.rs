//! The Annotation module persistence contracts.

use super::annotation::Annotation;
use super::label_class::LabelClass;
use super::prediction::Prediction;
use vailabel_core::{DomainResult, Repository};

/// Persistence contract for the `Annotation` aggregate: CRUD (via [`Repository`]),
/// typed list-by-image / list-by-project queries, and atomic save/delete.
pub trait AnnotationRepository: Repository<Annotation> {
    /// All annotations on an image.
    fn list_by_item(&self, item_id: &str) -> DomainResult<Vec<Annotation>>;

    /// All annotations in a project.
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<Annotation>>;

    /// Create-or-update in one transaction; returns the stored annotation and
    /// whether it was newly created (`true`) vs updated (`false`).
    fn save_atomic(&self, annotation: &Annotation) -> DomainResult<(Annotation, bool)>;

    /// Delete in one transaction, returning the prior value (or `None`).
    fn delete_returning(&self, id: &str) -> DomainResult<Option<Annotation>>;
}

/// Persistence contract for the `Prediction` aggregate: CRUD (via [`Repository`]),
/// list-by-image, and atomic save/delete. Predictions are written by the binary's
/// inference pipeline, so it drives these directly.
pub trait PredictionRepository: Repository<Prediction> {
    /// All predictions on an image.
    fn list_by_item(&self, item_id: &str) -> DomainResult<Vec<Prediction>>;

    /// Create-or-update in one transaction; returns the stored prediction and
    /// whether it was newly created (`true`) vs updated (`false`).
    fn save_atomic(&self, prediction: &Prediction) -> DomainResult<(Prediction, bool)>;

    /// Delete in one transaction, returning the prior value (or `None`).
    fn delete_returning(&self, id: &str) -> DomainResult<Option<Prediction>>;
}

/// Persistence contract for `LabelClass`: CRUD (via [`Repository`]), a typed
/// list-by-project query, and atomic single-transaction save/delete used by the
/// application layer.
pub trait LabelRepository: Repository<LabelClass> {
    /// All label classes belonging to `project_id`.
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<LabelClass>>;

    /// Create-or-update in one transaction; returns the stored label and whether
    /// it was newly created (`true`) vs updated (`false`).
    fn save_atomic(&self, label: &LabelClass) -> DomainResult<(LabelClass, bool)>;

    /// Delete in one transaction, returning the prior value (or `None`).
    fn delete_returning(&self, id: &str) -> DomainResult<Option<LabelClass>>;
}
