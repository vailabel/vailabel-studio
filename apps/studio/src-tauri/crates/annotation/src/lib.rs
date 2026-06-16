//! `vailabel-annotation` — the Annotation module.
//!
//! Owns the project's label catalog (`LabelClass`), the labeled shapes
//! (`Annotation`), and the AI prediction candidates (`Prediction`), each with
//! full layering: [`domain`] (entities + repository contracts), [`application`]
//! (CQRS + use-case services), [`infrastructure`] (typed Diesel persistence over
//! the shared `vailabel-db` connection), and [`contracts`] (request DTOs).

pub mod application;
pub mod contracts;
pub mod domain;
pub mod infrastructure;

pub use domain::{Annotation, LabelClass, Prediction};
