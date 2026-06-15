//! `vailabel-arch-tests` — executable enforcement of the dependency rule.
//!
//! This crate has no runtime code; its value is the integration tests in
//! `tests/dependency_rules.rs`, which fail the build if a pure crate's source
//! imports an infrastructure concern (diesel/tauri/reqwest/opendal/ort/
//! rusqlite/std::process/std::fs) or if its `Cargo.toml` depends on one. See
//! `crates/ARCHITECTURE.md` for the rule these tests encode.
