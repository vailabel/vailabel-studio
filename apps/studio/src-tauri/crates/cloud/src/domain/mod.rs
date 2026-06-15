//! The Cloud Storage domain: provider identity, the keychain convention, and
//! config validation. Pure — depends only on `core` + `serde_json`.

use serde_json::Value;
use vailabel_core::{DomainError, DomainResult};

/// Keychain namespace the frontend writes cloud secrets under (see
/// `cloud-storage-viewmodel.ts`). Keys are `"<configId>:<field>"`.
pub const SECRET_NAMESPACE: &str = "cloud-storage";

/// The supported object-store providers. The frontend sends the provider as a
/// lowercase tag; parsing here is the single place that decides what is
/// supported.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Provider {
    Aws,
    Azure,
    Gcp,
}

impl Provider {
    /// Parse the wire tag, or [`DomainError::Validation`] for an unknown one.
    pub fn parse(value: &str) -> DomainResult<Self> {
        match value {
            "aws" => Ok(Self::Aws),
            "azure" => Ok(Self::Azure),
            "gcp" => Ok(Self::Gcp),
            other => Err(DomainError::validation(format!(
                "Unsupported cloud provider '{other}'"
            ))),
        }
    }
}

/// Read a required non-secret config field (bucket/region/container/…),
/// trimming surrounding whitespace and rejecting blanks.
pub fn config_field(config: &Value, key: &str) -> DomainResult<String> {
    config
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .ok_or_else(|| DomainError::validation(format!("Cloud config is missing '{key}'")))
}

/// The keychain key under which a config's secret `field` is stored.
pub fn secret_key(config_id: &str, field: &str) -> String {
    format!("{config_id}:{field}")
}
