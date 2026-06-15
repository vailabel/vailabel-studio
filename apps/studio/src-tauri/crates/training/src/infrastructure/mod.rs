//! The Training infrastructure layer: typed Diesel persistence for training runs
//! over the shared `vailabel-db` connection. Only this layer touches `diesel`.

pub mod record;
pub mod repository;
pub mod schema;

pub use repository::DieselTrainingRepository;
