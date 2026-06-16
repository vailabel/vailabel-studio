//! The Workspace domain layer.

pub mod events;
pub mod history;
pub mod repository;
pub mod setting;

pub use events::{HistoryEvent, SettingEvent};
pub use history::History;
pub use repository::{HistoryRepository, SecretKeyRepository, SettingRepository};
pub use setting::Setting;
