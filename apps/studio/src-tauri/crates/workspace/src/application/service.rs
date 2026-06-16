//! Workspace use-case services: settings, history, and the secret-key registry.

use std::sync::Arc;

use serde_json::Value;
use vailabel_core::{DomainError, DomainResult};
use vailabel_shared::{new_id, EventPublisher, PortError};

use crate::application::commands::{SaveHistoryCommand, SaveSettingCommand};
use crate::application::queries::{GetSettingQuery, ListHistoryByProjectQuery};
use crate::domain::{
    History, HistoryEvent, HistoryRepository, SecretKeyRepository, Setting, SettingEvent,
    SettingRepository,
};

/// Event entity name for settings (unchanged from the residual store).
const SETTINGS_ENTITY: &str = "settings";
/// Event entity name for history (unchanged from the residual store).
const HISTORY_ENTITY: &str = "history";

/// Application service for `Setting` key/value configuration.
pub struct SettingAppService {
    repo: Arc<dyn SettingRepository>,
    events: Arc<dyn EventPublisher>,
}

impl SettingAppService {
    pub fn new(repo: Arc<dyn SettingRepository>, events: Arc<dyn EventPublisher>) -> Self {
        Self { repo, events }
    }

    /// All settings.
    pub fn list(&self) -> DomainResult<Vec<Setting>> {
        self.repo.list()
    }

    /// Fetch one setting by its unique key, or `None`.
    pub fn get(&self, query: GetSettingQuery) -> DomainResult<Option<Setting>> {
        self.repo.get_by_key(&query.key)
    }

    /// Upsert a setting by its unique key (id minted when absent), then publish
    /// `created`/`updated` depending on whether the key already existed.
    pub fn set(&self, command: SaveSettingCommand) -> DomainResult<Setting> {
        let mut payload = command.payload;
        ensure_id(&mut payload);
        let setting: Setting = serde_json::from_value(payload)
            .map_err(|e| DomainError::validation(e.to_string()))?;

        let existed = !setting.key.is_empty() && self.repo.get_by_key(&setting.key)?.is_some();
        let stored = self.repo.upsert_by_key(&setting)?;
        let event = if existed {
            SettingEvent::Updated {
                id: stored.id.clone(),
            }
        } else {
            SettingEvent::Created {
                id: stored.id.clone(),
            }
        };
        self.publish(SETTINGS_ENTITY, &stored, event.action())?;
        Ok(stored)
    }

    fn publish(&self, entity: &str, setting: &Setting, action: &str) -> DomainResult<()> {
        let payload =
            serde_json::to_value(setting).map_err(|e| DomainError::repository(e.to_string()))?;
        self.events
            .publish(entity, action, &payload)
            .map_err(PortError::into_domain)
    }
}

/// Application service for per-project undo/redo `History`.
pub struct HistoryAppService {
    repo: Arc<dyn HistoryRepository>,
    events: Arc<dyn EventPublisher>,
}

impl HistoryAppService {
    pub fn new(repo: Arc<dyn HistoryRepository>, events: Arc<dyn EventPublisher>) -> Self {
        Self { repo, events }
    }

    /// All history snapshots in a project.
    pub fn list_by_project(&self, query: ListHistoryByProjectQuery) -> DomainResult<Vec<History>> {
        self.repo.list_by_project(&query.project_id)
    }

    /// Create or update a history snapshot, then publish the corresponding event.
    pub fn save(&self, command: SaveHistoryCommand) -> DomainResult<History> {
        let mut payload = command.payload;
        ensure_id(&mut payload);
        let history: History = serde_json::from_value(payload)
            .map_err(|e| DomainError::validation(e.to_string()))?;

        let (stored, created) = self.repo.save_atomic(&history)?;
        let event = if created {
            HistoryEvent::Created {
                id: stored.id.clone(),
            }
        } else {
            HistoryEvent::Updated {
                id: stored.id.clone(),
            }
        };
        self.publish(&stored, event.action())?;
        Ok(stored)
    }

    fn publish(&self, history: &History, action: &str) -> DomainResult<()> {
        let payload =
            serde_json::to_value(history).map_err(|e| DomainError::repository(e.to_string()))?;
        self.events
            .publish(HISTORY_ENTITY, action, &payload)
            .map_err(PortError::into_domain)
    }
}

/// Application service for the keychain secret-key registry. No domain events —
/// it only tracks which key names exist so they can be listed.
pub struct SecretKeyAppService {
    repo: Arc<dyn SecretKeyRepository>,
}

impl SecretKeyAppService {
    pub fn new(repo: Arc<dyn SecretKeyRepository>) -> Self {
        Self { repo }
    }

    /// Record that a key name exists under a namespace.
    pub fn register(&self, namespace: &str, name: &str) -> DomainResult<()> {
        self.repo.register(namespace, name)
    }

    /// Forget a key name under a namespace.
    pub fn unregister(&self, namespace: &str, name: &str) -> DomainResult<()> {
        self.repo.unregister(namespace, name)
    }

    /// All recorded key names under a namespace.
    pub fn list(&self, namespace: &str) -> DomainResult<Vec<String>> {
        self.repo.list(namespace)
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
