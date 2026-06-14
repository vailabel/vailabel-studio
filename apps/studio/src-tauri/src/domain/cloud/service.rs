use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use opendal::{services, Operator};
use serde_json::Value;
use std::path::PathBuf;

use crate::domain::cloud::model::{
    BatchResult, CloudBatchPayload, CloudConfigPayload, CloudListPayload, CloudObjectMeta,
    CloudObjectPayload, TestConnectionResult, TransferFailure,
};
use crate::{read_secret, AppError};

/// Keychain namespace the frontend writes cloud secrets under (see
/// `cloud-storage-viewmodel.ts`). Keys are `"<configId>:<field>"`.
const SECRET_NAMESPACE: &str = "cloud-storage";

fn config_str(config: &Value, key: &str) -> Result<String, AppError> {
    config
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .ok_or_else(|| AppError::Message(format!("Cloud config is missing '{key}'")))
}

fn secret(config_id: &str, field: &str) -> Result<String, AppError> {
    read_secret(SECRET_NAMESPACE, &format!("{config_id}:{field}"))?
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            AppError::Message(format!("Missing secret '{field}' for this configuration"))
        })
}

/// Build an OpenDAL operator for the given provider from the non-secret config
/// plus the secrets stored in the OS keychain.
pub fn build_operator(
    config_id: &str,
    provider: &str,
    config: &Value,
) -> Result<Operator, AppError> {
    let operator = match provider {
        "aws" => {
            let builder = services::S3::default()
                .bucket(&config_str(config, "bucket")?)
                .region(&config_str(config, "region")?)
                .access_key_id(&secret(config_id, "accessKeyId")?)
                .secret_access_key(&secret(config_id, "secretAccessKey")?);
            Operator::new(builder)?.finish()
        }
        "azure" => {
            let account_name = config_str(config, "accountName")?;
            let builder = services::Azblob::default()
                .container(&config_str(config, "container")?)
                .account_name(&account_name)
                .account_key(&secret(config_id, "accountKey")?)
                .endpoint(&format!("https://{account_name}.blob.core.windows.net"));
            Operator::new(builder)?.finish()
        }
        "gcp" => {
            // OpenDAL's GCS service expects the service-account JSON as a
            // base64-encoded credential string.
            let service_account_json = secret(config_id, "serviceAccountJson")?;
            let builder = services::Gcs::default()
                .bucket(&config_str(config, "bucket")?)
                .credential(&BASE64.encode(service_account_json.as_bytes()));
            Operator::new(builder)?.finish()
        }
        other => {
            return Err(AppError::Message(format!(
                "Unsupported cloud provider '{other}'"
            )))
        }
    };
    Ok(operator)
}

/// Probe connectivity + credentials without raising — the UI shows the message.
pub fn test_connection(payload: CloudConfigPayload) -> TestConnectionResult {
    match check(&payload) {
        Ok(()) => TestConnectionResult {
            ok: true,
            message: "Connection successful".into(),
        },
        Err(error) => TestConnectionResult {
            ok: false,
            message: error.to_string(),
        },
    }
}

fn check(payload: &CloudConfigPayload) -> Result<(), AppError> {
    let operator = build_operator(&payload.config_id, &payload.provider, &payload.config)?;
    tauri::async_runtime::block_on(async move { operator.check().await })?;
    Ok(())
}

pub fn upload_files(payload: CloudBatchPayload) -> Result<BatchResult, AppError> {
    let operator = build_operator(&payload.config_id, &payload.provider, &payload.config)?;
    let mut result = BatchResult::default();
    tauri::async_runtime::block_on(async {
        for item in &payload.items {
            match upload_one(&operator, &item.key, &item.path).await {
                Ok(()) => result.succeeded.push(item.key.clone()),
                Err(error) => result.failed.push(TransferFailure {
                    key: item.key.clone(),
                    error: error.to_string(),
                }),
            }
        }
    });
    Ok(result)
}

async fn upload_one(operator: &Operator, key: &str, path: &str) -> Result<(), AppError> {
    // One image at a time: peak memory is a single file, not the whole batch.
    let bytes = std::fs::read(path)?;
    operator.write(key, bytes).await?;
    Ok(())
}

pub fn download_files(payload: CloudBatchPayload) -> Result<BatchResult, AppError> {
    let operator = build_operator(&payload.config_id, &payload.provider, &payload.config)?;
    let mut result = BatchResult::default();
    tauri::async_runtime::block_on(async {
        for item in &payload.items {
            match download_one(&operator, &item.key, &item.path).await {
                Ok(()) => result.succeeded.push(item.key.clone()),
                Err(error) => result.failed.push(TransferFailure {
                    key: item.key.clone(),
                    error: error.to_string(),
                }),
            }
        }
    });
    Ok(result)
}

async fn download_one(operator: &Operator, key: &str, path: &str) -> Result<(), AppError> {
    let buffer = operator.read(key).await?;
    let destination = PathBuf::from(path);
    if let Some(parent) = destination.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(destination, buffer.to_vec())?;
    Ok(())
}

pub fn delete_object(payload: CloudObjectPayload) -> Result<(), AppError> {
    let operator = build_operator(&payload.config_id, &payload.provider, &payload.config)?;
    tauri::async_runtime::block_on(async move { operator.delete(&payload.key).await })?;
    Ok(())
}

pub fn list_objects(payload: CloudListPayload) -> Result<Vec<CloudObjectMeta>, AppError> {
    let operator = build_operator(&payload.config_id, &payload.provider, &payload.config)?;
    let prefix = payload.prefix.clone().unwrap_or_default();
    let entries =
        tauri::async_runtime::block_on(async { operator.list_with(&prefix).recursive(true).await })?;

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
        if let Some(limit) = payload.limit {
            if metas.len() >= limit {
                break;
            }
        }
    }
    Ok(metas)
}
