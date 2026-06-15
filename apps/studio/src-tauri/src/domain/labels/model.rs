//! Re-export shim.
//!
//! `Label` is now the annotation module's `LabelClass` aggregate (in the
//! `vailabel-annotation` crate). This shim keeps
//! `crate::domain::labels::model::{Label, ProjectIdPayload}` valid for existing
//! importers; the orphan-violating local `impl HasId for Label` is gone (the
//! crate implements `core::Identifiable`).

pub use vailabel_annotation::contracts::ProjectIdPayload;
pub use vailabel_annotation::domain::LabelClass as Label;
