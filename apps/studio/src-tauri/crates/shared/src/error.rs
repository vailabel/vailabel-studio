//! The shared infrastructure-port error.

use thiserror::Error;

/// Error returned by a shared infrastructure port (e.g. [`crate::EventPublisher`]).
///
/// Carries a stringified cause so that callers working in `core`/domain terms
/// can map it to `DomainError::Repository` without depending on any concrete
/// infrastructure error type.
#[derive(Debug, Clone, Error)]
#[error("{0}")]
pub struct PortError(pub String);

impl PortError {
    /// Construct a port error from any message.
    pub fn new(message: impl Into<String>) -> Self {
        PortError(message.into())
    }

    /// Map this port error into a [`vailabel_core::DomainError::Repository`].
    pub fn into_domain(self) -> vailabel_core::DomainError {
        vailabel_core::DomainError::Repository(self.0)
    }
}
