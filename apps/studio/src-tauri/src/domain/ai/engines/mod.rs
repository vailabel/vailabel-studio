//! Concrete inference engines for capability-aware model plugins.
//!
//! Each engine implements [`crate::domain::ai::plugin::ModelPlugin`] and is wired
//! into [`crate::domain::ai::plugin::plugin_for`]. They are gated behind the
//! `local-inference` feature (the ONNX Runtime stack); without it the registry
//! entries resolve to the scaffold `NotImplementedPlugin`.

#[cfg(feature = "local-inference")]
pub mod sam;
