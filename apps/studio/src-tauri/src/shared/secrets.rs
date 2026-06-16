//! OS-keychain secret helpers, shared by the workspace `secret_*` commands and
//! the cloud / copilot backends (so secrets never round-trip through the
//! frontend to reach a backend operation). `read_secret` is re-exported as
//! `crate::read_secret`.

use keyring::Entry;

use crate::AppError;

const SERVICE_NAME: &str = "com.vailabel.studio";

pub(crate) fn keyring_entry(namespace: &str, key: &str) -> Result<Entry, AppError> {
    Ok(Entry::new(SERVICE_NAME, &format!("{namespace}:{key}"))?)
}

/// Read a secret from the OS keychain, returning `None` when no entry exists.
pub(crate) fn read_secret(namespace: &str, key: &str) -> Result<Option<String>, AppError> {
    match keyring_entry(namespace, key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(AppError::Keyring(error)),
    }
}
