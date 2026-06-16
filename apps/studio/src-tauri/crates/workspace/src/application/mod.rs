//! The Workspace application layer: CQRS commands/queries and the use-case
//! services for settings, history, and the secret-key registry.

pub mod commands;
pub mod queries;
pub mod service;

pub use commands::{SaveHistoryCommand, SaveSettingCommand};
pub use queries::{GetSettingQuery, ListHistoryByProjectQuery};
pub use service::{HistoryAppService, SecretKeyAppService, SettingAppService};
