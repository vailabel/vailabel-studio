//! Re-export shim.
//!
//! The cloud DTOs now live in `vailabel_cloud::contracts`. This shim keeps the
//! historical path `crate::domain::cloud::model::*` valid so `commands.rs`
//! compiles unchanged. Reverting the cloud migration = restoring this file (and
//! `service.rs`) to their prior bodies.

pub use vailabel_cloud::contracts::{
    BatchResult, CloudBatchPayload, CloudConfigPayload, CloudListPayload, CloudObjectMeta,
    CloudObjectPayload, FileTransferItem, TestConnectionResult, TransferFailure,
};
