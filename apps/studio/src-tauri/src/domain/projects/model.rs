//! Re-export shim.
//!
//! The `Project` aggregate and its request DTOs now live in the `vailabel-project`
//! crate (`domain` / `contracts`). This shim keeps the historical path
//! `crate::domain::projects::model::{Project, EntityIdPayload, ProjectIdPayload}`
//! valid so the ~6 existing importers compile unchanged. `Project` implements
//! `vailabel_core::Identifiable` in the crate, which `HasId` now aliases — so the
//! local `impl HasId for Project` that used to live here is gone (and would in
//! any case be an orphan-rule violation now that `Project` is a foreign type).

pub use vailabel_project::contracts::{EntityIdPayload, ProjectIdPayload};
pub use vailabel_project::domain::Project;
