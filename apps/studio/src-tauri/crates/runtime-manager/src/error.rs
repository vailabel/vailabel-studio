use thiserror::Error;

/// Errors surfaced by the runtime manager. Kept `String`-backed so the type is
/// `Send + Sync + 'static` and trivially crosses the Tauri command boundary.
#[derive(Debug, Error)]
pub enum RuntimeError {
    #[error("runtime is not started")]
    NotStarted,

    #[error("runtime failed to become healthy within the startup timeout")]
    StartTimeout,

    #[error("runtime executable not found: {0}")]
    ExecutableNotFound(String),

    #[error("failed to allocate a local port: {0}")]
    PortAllocation(String),

    #[error("failed to spawn runtime process: {0}")]
    Spawn(String),

    #[error("http error talking to runtime: {0}")]
    Http(String),

    #[error("io error: {0}")]
    Io(String),

    #[error("runtime returned status {status}: {body}")]
    Status { status: u16, body: String },

    #[error("{0}")]
    Other(String),
}

impl From<reqwest::Error> for RuntimeError {
    fn from(e: reqwest::Error) -> Self {
        RuntimeError::Http(e.to_string())
    }
}

impl From<std::io::Error> for RuntimeError {
    fn from(e: std::io::Error) -> Self {
        RuntimeError::Io(e.to_string())
    }
}

pub type Result<T> = std::result::Result<T, RuntimeError>;
