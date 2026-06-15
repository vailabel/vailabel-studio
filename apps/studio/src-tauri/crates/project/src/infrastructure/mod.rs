//! The Project infrastructure layer: typed Diesel persistence over the shared
//! `vailabel-db` connection. This is the only layer of the crate allowed to
//! touch `diesel`; `domain`/`application`/`contracts` stay pure.

pub mod record;
pub mod repository;
pub mod schema;

pub use repository::DieselProjectRepository;
