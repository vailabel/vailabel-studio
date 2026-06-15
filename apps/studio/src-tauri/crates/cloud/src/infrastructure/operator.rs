//! OpenDAL-backed implementation of the object-store port.
//!
//! This is the only place in the crate that knows about OpenDAL and the local
//! filesystem. It builds a provider-specific [`Operator`] from the non-secret
//! config plus the secrets resolved through the [`SecretStore`] port.

use std::sync::Arc;

use async_trait::async_trait;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use opendal::{services, Operator};
use serde_json::Value;
use vailabel_core::{DomainError, DomainResult};

use crate::application::ports::{ObjectStore, ObjectStoreFactory, SecretStore};
use crate::contracts::CloudObjectMeta;
use crate::domain::{config_field, secret_key, Provider, SECRET_NAMESPACE};

/// Map any infrastructure error into the domain's repository variant.
fn repo(error: impl ToString) -> DomainError {
    DomainError::repository(error.to_string())
}

/// Builds [`OpenDalStore`]s, resolving each config's secrets via the injected
/// [`SecretStore`].
pub struct OpenDalFactory {
    secrets: Arc<dyn SecretStore>,
}

impl OpenDalFactory {
    /// Build the factory over an OS-keychain secret reader.
    pub fn new(secrets: Arc<dyn SecretStore>) -> Self {
        Self { secrets }
    }

    fn secret(&self, config_id: &str, field: &str) -> DomainResult<String> {
        self.secrets
            .get(SECRET_NAMESPACE, &secret_key(config_id, field))?
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                DomainError::validation(format!("Missing secret '{field}' for this configuration"))
            })
    }
}

impl ObjectStoreFactory for OpenDalFactory {
    fn connect(
        &self,
        config_id: &str,
        provider: &str,
        config: &Value,
    ) -> DomainResult<Box<dyn ObjectStore>> {
        let operator = match Provider::parse(provider)? {
            Provider::Aws => {
                let builder = services::S3::default()
                    .bucket(&config_field(config, "bucket")?)
                    .region(&config_field(config, "region")?)
                    .access_key_id(&self.secret(config_id, "accessKeyId")?)
                    .secret_access_key(&self.secret(config_id, "secretAccessKey")?);
                Operator::new(builder).map_err(repo)?.finish()
            }
            Provider::Azure => {
                let account_name = config_field(config, "accountName")?;
                let builder = services::Azblob::default()
                    .container(&config_field(config, "container")?)
                    .account_name(&account_name)
                    .account_key(&self.secret(config_id, "accountKey")?)
                    .endpoint(&format!("https://{account_name}.blob.core.windows.net"));
                Operator::new(builder).map_err(repo)?.finish()
            }
            Provider::Gcp => {
                // OpenDAL's GCS service expects the service-account JSON as a
                // base64-encoded credential string.
                let service_account_json = self.secret(config_id, "serviceAccountJson")?;
                let builder = services::Gcs::default()
                    .bucket(&config_field(config, "bucket")?)
                    .credential(&BASE64.encode(service_account_json.as_bytes()));
                Operator::new(builder).map_err(repo)?.finish()
            }
        };
        Ok(Box::new(OpenDalStore { operator }))
    }
}

/// One connected OpenDAL operator.
struct OpenDalStore {
    operator: Operator,
}

#[async_trait]
impl ObjectStore for OpenDalStore {
    async fn check(&self) -> DomainResult<()> {
        self.operator.check().await.map_err(repo)
    }

    async fn upload(&self, key: &str, local_path: &str) -> DomainResult<()> {
        let bytes = std::fs::read(local_path).map_err(repo)?;
        self.operator.write(key, bytes).await.map_err(repo)?;
        Ok(())
    }

    async fn download(&self, key: &str, local_path: &str) -> DomainResult<()> {
        let buffer = self.operator.read(key).await.map_err(repo)?;
        let destination = std::path::PathBuf::from(local_path);
        if let Some(parent) = destination.parent() {
            std::fs::create_dir_all(parent).map_err(repo)?;
        }
        std::fs::write(destination, buffer.to_vec()).map_err(repo)?;
        Ok(())
    }

    async fn delete(&self, key: &str) -> DomainResult<()> {
        self.operator.delete(key).await.map_err(repo)
    }

    async fn list(&self, prefix: &str, limit: Option<usize>) -> DomainResult<Vec<CloudObjectMeta>> {
        let entries = self
            .operator
            .list_with(prefix)
            .recursive(true)
            .await
            .map_err(repo)?;

        let mut metas = Vec::new();
        for entry in entries {
            let metadata = entry.metadata();
            if metadata.is_dir() {
                continue;
            }
            metas.push(CloudObjectMeta {
                key: entry.path().to_string(),
                size: metadata.content_length(),
                last_modified: metadata.last_modified().map(|time| time.to_rfc3339()),
            });
            if let Some(limit) = limit {
                if metas.len() >= limit {
                    break;
                }
            }
        }
        Ok(metas)
    }
}
