//! Persistence contracts for the workspace aggregates.

use vailabel_core::{DomainResult, Repository};

use super::history::History;
use super::setting::Setting;

/// Persistence contract for `Setting`. Keyed by the unique `key` (not by id), so
/// this does NOT extend [`Repository`]; it offers key-centric access instead.
pub trait SettingRepository: Send + Sync {
    /// All settings.
    fn list(&self) -> DomainResult<Vec<Setting>>;

    /// Fetch the setting with the given unique `key`, or `None`.
    fn get_by_key(&self, key: &str) -> DomainResult<Option<Setting>>;

    /// Insert-or-update by unique `key`, preserving the existing row id when the
    /// key is already present. Returns the stored setting.
    fn upsert_by_key(&self, setting: &Setting) -> DomainResult<Setting>;
}

/// Persistence contract for `History`: CRUD (via [`Repository`]), list-by-project,
/// and an atomic single-transaction save.
pub trait HistoryRepository: Repository<History> {
    /// All history snapshots belonging to `project_id`.
    fn list_by_project(&self, project_id: &str) -> DomainResult<Vec<History>>;

    /// Create-or-update in one transaction; returns the stored snapshot and
    /// whether it was newly created (`true`) vs updated (`false`).
    fn save_atomic(&self, history: &History) -> DomainResult<(History, bool)>;
}

/// Registry of keychain entry *names* per namespace. The secret values live in
/// the OS keychain; this only records which names exist so they can be listed.
pub trait SecretKeyRepository: Send + Sync {
    /// Record that `name` exists under `namespace` (idempotent).
    fn register(&self, namespace: &str, name: &str) -> DomainResult<()>;

    /// Forget `name` under `namespace`.
    fn unregister(&self, namespace: &str, name: &str) -> DomainResult<()>;

    /// All recorded key names under `namespace`.
    fn list(&self, namespace: &str) -> DomainResult<Vec<String>>;
}
