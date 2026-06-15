//! Re-export shim.
//!
//! The `Image` asset and its request DTOs now live in the `vailabel-dataset`
//! crate. This shim keeps `crate::modules::images::model::{Image, ProjectIdPayload,
//! ImageRangePayload}` valid for existing importers. `Image` implements
//! `vailabel_core::Identifiable` (which `HasId` aliases) in the crate, so the
//! local `impl HasId for Image` is gone (it would be an orphan-rule violation
//! now that `Image` is a foreign type). The image repository/service stay in the
//! binary for Phase 1 and operate on this re-exported type unchanged.

pub use vailabel_dataset::contracts::{ImageRangePayload, ProjectIdPayload};
pub use vailabel_dataset::domain::Image;
