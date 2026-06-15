//! The ports the cloud use cases depend on. The composition root implements
//! these over OpenDAL (object store) and the OS keychain (secrets); the
//! application layer stays unaware of both.

use async_trait::async_trait;
use serde_json::Value;
use vailabel_core::DomainResult;

use crate::contracts::CloudObjectMeta;

/// Read secret material from the OS keychain. Implemented at the composition
/// root so the crate never depends on `keyring`; consumed by the
/// [`ObjectStoreFactory`] to resolve a config's credentials.
pub trait SecretStore: Send + Sync {
    /// Fetch the secret stored under `namespace`/`key`, or `None` when absent.
    fn get(&self, namespace: &str, key: &str) -> DomainResult<Option<String>>;
}

/// A connected object store bound to one cloud configuration. The local-path
/// arguments keep filesystem access (and OpenDAL) entirely inside the
/// infrastructure implementation.
#[async_trait]
pub trait ObjectStore: Send + Sync {
    /// Probe connectivity + credentials.
    async fn check(&self) -> DomainResult<()>;

    /// Upload the file at `local_path` to `key`.
    async fn upload(&self, key: &str, local_path: &str) -> DomainResult<()>;

    /// Download `key` to `local_path`, creating parent directories.
    async fn download(&self, key: &str, local_path: &str) -> DomainResult<()>;

    /// Delete `key`.
    async fn delete(&self, key: &str) -> DomainResult<()>;

    /// List objects under `prefix` (recursively), stopping at `limit` if given.
    async fn list(&self, prefix: &str, limit: Option<usize>) -> DomainResult<Vec<CloudObjectMeta>>;
}

/// Builds an [`ObjectStore`] for a given provider/config, resolving the config's
/// secrets along the way. Building is synchronous (no network); the store's
/// operations are async.
pub trait ObjectStoreFactory: Send + Sync {
    /// Connect to the store described by `config_id`/`provider`/`config`.
    fn connect(
        &self,
        config_id: &str,
        provider: &str,
        config: &Value,
    ) -> DomainResult<Box<dyn ObjectStore>>;
}
