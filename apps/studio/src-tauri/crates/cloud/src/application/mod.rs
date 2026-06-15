//! The Cloud Storage application layer: the use-case service plus the ports it
//! orchestrates (object store + secret access), injected by the composition
//! root. No OpenDAL or filesystem knowledge.

pub mod ports;
pub mod service;

pub use ports::{ObjectStore, ObjectStoreFactory, SecretStore};
pub use service::CloudStorageService;
