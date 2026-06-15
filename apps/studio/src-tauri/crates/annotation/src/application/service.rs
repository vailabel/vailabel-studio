//! The LabelClass use-case service.

use std::sync::Arc;

use serde_json::{json, Value};
use vailabel_core::{DomainError, DomainResult, Identifiable};
use vailabel_shared::{new_id, EventPublisher, PortError};

use crate::application::commands::{DeleteLabelCommand, SaveLabelCommand};
use crate::application::queries::{GetLabelQuery, ListLabelsByProjectQuery};
use crate::domain::{LabelClass, LabelEvent, LabelRepository};

/// The store `kind` / event entity name for labels (unchanged from `"labels"`).
const ENTITY: &str = "labels";

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
