//! The Project use-case service.

use std::sync::Arc;

use serde_json::{json, Value};
use vailabel_core::{DomainError, DomainResult, Identifiable};
use vailabel_shared::{new_id, EventPublisher, PortError};

use crate::application::commands::{DeleteProjectCommand, SaveProjectCommand};
use crate::application::queries::{GetProjectQuery, ListProjectsQuery};
use crate::domain::{Project, ProjectEvent, ProjectRepository};

/// The store `kind` and event entity name for projects (unchanged from the
/// binary's `"projects"`).
const ENTITY: &str = "projects";

/// Application service for the `Project` aggregate.
///
/// Orchestrates the repository and the event port for the project use cases. It
/// depends only on ports ([`ProjectRepository`], [`EventPublisher`]) injected by
/// the composition root, so it carries no Tauri/diesel knowledge and is unit
/// testable with in-memory fakes.
pub struct ProjectAppService {
    repo: Arc<dyn ProjectRepository + Send + Sync>,
    events: Arc<dyn EventPublisher>,
}

impl ProjectAppService {
    /// Build the service from its injected ports.
    pub fn new(
        repo: Arc<dyn ProjectRepository + Send + Sync>,
        events: Arc<dyn EventPublisher>,
    ) -> Self {
        Self { repo, events }
    }

    /// List all projects.
    pub fn list(&self, _query: ListProjectsQuery) -> DomainResult<Vec<Project>> {
        self.repo.list()
    }

    /// Fetch one project, or [`DomainError::NotFound`] if absent.
    pub fn get(&self, query: GetProjectQuery) -> DomainResult<Project> {
        self.repo
            .get(&query.id)?
            .ok_or_else(|| DomainError::not_found("Project"))
    }

    /// Create or update a project, then publish the corresponding event.
    ///
    /// Mirrors the binary's `save_entity`: mint an id when absent, deserialize,
    /// upsert (create vs update decided by existence), emit, return the stored
    /// project.
    pub fn save(&self, command: SaveProjectCommand) -> DomainResult<Project> {
        let mut payload = command.payload;
        ensure_id(&mut payload);
        let project: Project = serde_json::from_value(payload)
            .map_err(|e| DomainError::validation(e.to_string()))?;

        let id = project.id().to_string();
        let (stored, event) = if self.repo.get(&id)?.is_some() {
            (self.repo.update(&project)?, ProjectEvent::Updated { id })
        } else {
            (self.repo.create(&project)?, ProjectEvent::Created { id })
        };

        self.publish(&stored, &event)?;
        Ok(stored)
    }

    /// Delete a project, then publish a `deleted` event carrying its last value.
    /// Returns `{ "success": true }`, matching the existing command response.
    pub fn delete(&self, command: DeleteProjectCommand) -> DomainResult<Value> {
        let existing = self
            .repo
            .get(&command.id)?
            .ok_or_else(|| DomainError::not_found("Project"))?;
        self.repo.delete(&command.id)?;
        self.publish(&existing, &ProjectEvent::Deleted { id: command.id })?;
        Ok(json!({ "success": true }))
    }

    fn publish(&self, project: &Project, event: &ProjectEvent) -> DomainResult<()> {
        let payload =
            serde_json::to_value(project).map_err(|e| DomainError::repository(e.to_string()))?;
        self.events
            .publish(ENTITY, event.action(), &payload)
            .map_err(PortError::into_domain)
    }
}

/// Ensure the payload carries a non-empty `id`, minting a UUID otherwise. The
/// frontend omits `id` on create and relies on the backend to assign one — the
/// same contract the binary's `ensure_id` honored.
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
