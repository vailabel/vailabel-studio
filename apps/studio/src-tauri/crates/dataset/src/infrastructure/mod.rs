//! The Dataset infrastructure layer: typed Diesel persistence for images over
//! the shared `vailabel-db` connection. Only this layer touches `diesel`.

pub mod record;
pub mod repository;
pub mod schema;

pub use repository::DieselImageRepository;
