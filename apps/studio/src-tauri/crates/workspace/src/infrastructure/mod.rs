//! The Workspace infrastructure layer: typed Diesel persistence for settings,
//! history, and the secret-key registry over the shared `vailabel-db`
//! connection. Only this layer touches `diesel`.

pub mod record;
pub mod repository;
pub mod schema;

pub use repository::{
    DieselHistoryRepository, DieselSecretKeyRepository, DieselSettingRepository,
};
