use thiserror::Error;

pub type Result<T> = std::result::Result<T, AgentError>;

#[derive(Debug, Error)]
pub enum AgentError {
    /// The agent could not be reached (down, wrong address, network).
    #[error("could not reach the training agent at {url}: {source}")]
    Unreachable {
        url: String,
        #[source]
        source: reqwest::Error,
    },
    /// The agent rejected the token.
    #[error("the training agent rejected the access token")]
    Unauthorized,
    /// The agent answered with an error status; `message` is its explanation.
    #[error("training agent error ({status}): {message}")]
    Api { status: u16, message: String },
    #[error("unexpected response from the training agent: {0}")]
    Decode(#[source] reqwest::Error),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    /// An archive entry that could write outside the destination, or is not a
    /// plain file/directory.
    #[error("refusing unsafe archive entry: {0}")]
    UnsafeArchive(String),
    #[error("{0}")]
    Invalid(String),
}
