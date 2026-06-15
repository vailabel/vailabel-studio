//! The domain error type.
//!
//! Domain and application layers speak `DomainError`, never an infrastructure
//! error (`diesel::Error`, `reqwest::Error`, …). The composition root maps
//! infrastructure failures into `DomainError::Repository`/`Validation`/… and
//! maps `DomainError` back into the binary's transport error (`AppError`).

use thiserror::Error;

/// A failure expressed purely in domain terms.
///
/// Variants carry a human-readable message rather than a typed cause so that
/// the domain stays free of infrastructure error types. Infrastructure
/// adapters stringify their native errors when crossing this boundary.
#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum DomainError {
    /// The requested aggregate/entity does not exist.
    #[error("{0} not found")]
    NotFound(String),

    /// The input violated a domain invariant or validation rule.
    #[error("validation error: {0}")]
    Validation(String),

    /// The operation conflicts with current state (e.g. a uniqueness clash).
    #[error("conflict: {0}")]
    Conflict(String),

    /// A repository/persistence-port operation failed. The string is the
    /// stringified infrastructure cause, captured at the boundary.
    #[error("repository error: {0}")]
    Repository(String),
}

impl DomainError {
    /// Convenience constructor for [`DomainError::NotFound`].
    pub fn not_found(what: impl Into<String>) -> Self {
        DomainError::NotFound(what.into())
    }

    /// Convenience constructor for [`DomainError::Validation`].
    pub fn validation(msg: impl Into<String>) -> Self {
        DomainError::Validation(msg.into())
    }

    /// Convenience constructor for [`DomainError::Conflict`].
    pub fn conflict(msg: impl Into<String>) -> Self {
        DomainError::Conflict(msg.into())
    }

    /// Convenience constructor for [`DomainError::Repository`].
    pub fn repository(msg: impl Into<String>) -> Self {
        DomainError::Repository(msg.into())
    }
}

/// The canonical domain result alias.
pub type DomainResult<T> = std::result::Result<T, DomainError>;

/// Spec-named alias (`Result<T>`), defaulting the error to [`DomainError`].
///
/// Prefer [`DomainResult`] in module code to avoid shadowing `std::result::Result`
/// where both are in scope; this alias exists to match the architecture spec.
pub type Result<T, E = DomainError> = std::result::Result<T, E>;
