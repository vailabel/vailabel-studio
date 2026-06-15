//! `vailabel-cloud` — the Cloud Storage module.
//!
//! Syncs annotation assets to an external object store (S3 / Azure Blob / GCS).
//! Layered like the Phase 1 module crates:
//!
//! - [`domain`] — provider parsing, the secret-namespace convention, and config
//!   validation. Pure: depends only on `core` + `serde_json`.
//! - [`application`] — the [`application::CloudStorageService`] use cases
//!   (connection test, batch upload/download, delete, list) plus the ports
//!   ([`application::ObjectStore`], [`application::ObjectStoreFactory`],
//!   [`application::SecretStore`]) the composition root wires to infrastructure.
//!   Carries no OpenDAL or filesystem knowledge.
//! - [`infrastructure`] — the OpenDAL-backed [`infrastructure::OpenDalFactory`]
//!   implementing the object-store port (the only layer allowed `opendal::` and
//!   `std::fs`).
//! - [`contracts`] — the request/response DTOs the Tauri commands serialize.

pub mod application;
pub mod contracts;
pub mod domain;
pub mod infrastructure;
