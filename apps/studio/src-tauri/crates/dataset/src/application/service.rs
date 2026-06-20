//! The Item use-case service.

use std::sync::Arc;

use serde_json::{json, Value};
use vailabel_core::{DomainError, DomainResult, Identifiable};
use vailabel_shared::{new_id, EventPublisher, PortError};

use crate::application::commands::{DeleteItemCommand, SaveItemCommand};
use crate::application::queries::{
    GetItemQuery, ListItemsByProjectQuery, ListItemsPageQuery, ListItemsRangeQuery,
};
use crate::domain::{Item, ItemEvent, ItemRepository};

/// One page of items + the total count (search-aware) for a server-driven pager.
pub struct ItemPage {
    pub items: Vec<Item>,
    pub total: usize,
}

/// The store `kind` / event entity name for items.
const ENTITY: &str = "items";

/// Application service for the `Item` asset: orchestrates the repository and
/// the event port. Depends only on ports injected by the composition root.
pub struct ItemAppService {
    repo: Arc<dyn ItemRepository + Send + Sync>,
    events: Arc<dyn EventPublisher>,
}

impl ItemAppService {
    pub fn new(
        repo: Arc<dyn ItemRepository + Send + Sync>,
        events: Arc<dyn EventPublisher>,
    ) -> Self {
        Self { repo, events }
    }

    /// All items in a project.
    pub fn list_by_project(&self, query: ListItemsByProjectQuery) -> DomainResult<Vec<Item>> {
        self.repo.list_by_project(&query.project_id)
    }

    /// One offset/limit page of a project's items via a real SQL `LIMIT`/`OFFSET`
    /// (no longer loads the whole project into memory).
    pub fn list_range(&self, query: ListItemsRangeQuery) -> DomainResult<Vec<Item>> {
        let offset = query.offset.unwrap_or(0) as i64;
        // No limit given → fall back to "all" with a large bound.
        let limit = query.limit.map(|l| l as i64).unwrap_or(i64::MAX);
        self.repo.list_page(&query.project_id, offset, limit, None)
    }

    /// One page of a project's items plus the search-aware total, for a
    /// server-driven pager / infinite scroll.
    pub fn list_page(&self, query: ListItemsPageQuery) -> DomainResult<ItemPage> {
        let search = query
            .search
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty());
        let items =
            self.repo
                .list_page(&query.project_id, query.offset as i64, query.limit as i64, search)?;
        let total = self.repo.count_by_project(&query.project_id, search)? as usize;
        Ok(ItemPage { items, total })
    }

    /// Fetch one image, or [`DomainError::NotFound`].
    pub fn get(&self, query: GetItemQuery) -> DomainResult<Item> {
        self.repo
            .get(&query.id)?
            .ok_or_else(|| DomainError::not_found("Item"))
    }

    /// Create or update an image, then publish the corresponding event.
    pub fn save(&self, command: SaveItemCommand) -> DomainResult<Item> {
        let mut payload = command.payload;
        ensure_id(&mut payload);
        let image: Item = serde_json::from_value(payload)
            .map_err(|e| DomainError::validation(e.to_string()))?;

        let (stored, created) = self.repo.save_atomic(&image)?;
        let id = stored.id().to_string();
        let event = if created {
            ItemEvent::Created { id }
        } else {
            ItemEvent::Updated { id }
        };

        self.publish(&stored, &event)?;
        Ok(stored)
    }

    /// Delete an image, then publish a `deleted` event. Returns `{ "success": true }`.
    pub fn delete(&self, command: DeleteItemCommand) -> DomainResult<Value> {
        let existing = self
            .repo
            .delete_returning(&command.id)?
            .ok_or_else(|| DomainError::not_found("Item"))?;
        self.publish(&existing, &ItemEvent::Deleted { id: command.id })?;
        Ok(json!({ "success": true }))
    }

    fn publish(&self, image: &Item, event: &ItemEvent) -> DomainResult<()> {
        let payload =
            serde_json::to_value(image).map_err(|e| DomainError::repository(e.to_string()))?;
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
