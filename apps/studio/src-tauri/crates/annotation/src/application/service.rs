//! The LabelClass use-case service.

use std::sync::Arc;

use serde_json::{json, Value};
use vailabel_core::{DomainError, DomainResult, Identifiable};
use vailabel_shared::{new_id, EventPublisher, PortError};

use crate::application::commands::{
    DeleteAnnotationCommand, DeleteLabelCommand, SaveAnnotationCommand, SaveLabelCommand,
};
use crate::application::queries::{
    GetLabelQuery, ListAnnotationsByImageQuery, ListAnnotationsByProjectQuery,
    ListLabelsByProjectQuery,
};
use crate::domain::{
    Annotation, AnnotationEvent, AnnotationRepository, LabelClass, LabelEvent, LabelRepository,
};

/// The store `kind` / event entity name for labels (unchanged from `"labels"`).
const ENTITY: &str = "labels";

/// The event entity name for annotations (unchanged from `"annotations"`).
const ANNOTATIONS_ENTITY: &str = "annotations";

/// Application service for the `LabelClass` aggregate.
pub struct LabelClassAppService {
    repo: Arc<dyn LabelRepository + Send + Sync>,
    events: Arc<dyn EventPublisher>,
}

impl LabelClassAppService {
    pub fn new(
        repo: Arc<dyn LabelRepository + Send + Sync>,
        events: Arc<dyn EventPublisher>,
    ) -> Self {
        Self { repo, events }
    }

    /// All label classes in a project.
    pub fn list_by_project(&self, query: ListLabelsByProjectQuery) -> DomainResult<Vec<LabelClass>> {
        self.repo.list_by_project(&query.project_id)
    }

    /// Fetch one label class, or [`DomainError::NotFound`].
    pub fn get(&self, query: GetLabelQuery) -> DomainResult<LabelClass> {
        self.repo
            .get(&query.id)?
            .ok_or_else(|| DomainError::not_found("Label"))
    }

    /// Create or update a label class, then publish the corresponding event.
    pub fn save(&self, command: SaveLabelCommand) -> DomainResult<LabelClass> {
        let mut payload = command.payload;
        ensure_id(&mut payload);
        let label: LabelClass = serde_json::from_value(payload)
            .map_err(|e| DomainError::validation(e.to_string()))?;

        let (stored, created) = self.repo.save_atomic(&label)?;
        let id = stored.id().to_string();
        let event = if created {
            LabelEvent::Created { id }
        } else {
            LabelEvent::Updated { id }
        };

        self.publish(&stored, &event)?;
        Ok(stored)
    }

    /// Delete a label class, then publish a `deleted` event. Returns `{ "success": true }`.
    pub fn delete(&self, command: DeleteLabelCommand) -> DomainResult<Value> {
        let existing = self
            .repo
            .delete_returning(&command.id)?
            .ok_or_else(|| DomainError::not_found("Label"))?;
        self.publish(&existing, &LabelEvent::Deleted { id: command.id })?;
        Ok(json!({ "success": true }))
    }

    fn publish(&self, label: &LabelClass, event: &LabelEvent) -> DomainResult<()> {
        let payload =
            serde_json::to_value(label).map_err(|e| DomainError::repository(e.to_string()))?;
        self.events
            .publish(ENTITY, event.action(), &payload)
            .map_err(PortError::into_domain)
    }
}

/// Application service for the `Annotation` aggregate.
pub struct AnnotationAppService {
    repo: Arc<dyn AnnotationRepository + Send + Sync>,
    events: Arc<dyn EventPublisher>,
}

impl AnnotationAppService {
    pub fn new(
        repo: Arc<dyn AnnotationRepository + Send + Sync>,
        events: Arc<dyn EventPublisher>,
    ) -> Self {
        Self { repo, events }
    }

    /// All annotations on an image.
    pub fn list_by_image(
        &self,
        query: ListAnnotationsByImageQuery,
    ) -> DomainResult<Vec<Annotation>> {
        self.repo.list_by_image(&query.image_id)
    }

    /// All annotations in a project.
    pub fn list_by_project(
        &self,
        query: ListAnnotationsByProjectQuery,
    ) -> DomainResult<Vec<Annotation>> {
        self.repo.list_by_project(&query.project_id)
    }

    /// Create or update an annotation, then publish the corresponding event.
    pub fn save(&self, command: SaveAnnotationCommand) -> DomainResult<Annotation> {
        let mut payload = command.payload;
        ensure_id(&mut payload);
        let annotation: Annotation = serde_json::from_value(payload)
            .map_err(|e| DomainError::validation(e.to_string()))?;

        let (stored, created) = self.repo.save_atomic(&annotation)?;
        let id = stored.id().to_string();
        let event = if created {
            AnnotationEvent::Created { id }
        } else {
            AnnotationEvent::Updated { id }
        };
        self.publish(&stored, &event)?;
        Ok(stored)
    }

    /// Delete an annotation, then publish a `deleted` event. Returns `{ "success": true }`.
    pub fn delete(&self, command: DeleteAnnotationCommand) -> DomainResult<Value> {
        let existing = self
            .repo
            .delete_returning(&command.id)?
            .ok_or_else(|| DomainError::not_found("Annotation"))?;
        self.publish(&existing, &AnnotationEvent::Deleted { id: command.id })?;
        Ok(json!({ "success": true }))
    }

    fn publish(&self, annotation: &Annotation, event: &AnnotationEvent) -> DomainResult<()> {
        // Dual-key wire form so frontend readers using either casing keep working.
        let payload = annotation.to_value();
        self.events
            .publish(ANNOTATIONS_ENTITY, event.action(), &payload)
            .map_err(PortError::into_domain)
    }
}

/// Mint a non-empty `id` when the payload omits one (frontend create contract).
fn ensure_id(payload: &mut Value) {
    if let Value::Object(object) = payload {
        let has_id = object
            .get("id")
            .and_then(Value::as_str)
            .map(|id| !id.is_empty())
            .unwrap_or(false);
        if !has_id {
            object.insert("id".into(), Value::String(new_id()));
        }
    }
}
