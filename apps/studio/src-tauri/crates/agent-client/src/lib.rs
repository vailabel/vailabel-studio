//! Wire protocol and HTTP client for the Vailabel training agent.
//!
//! The agent (`vailabel-agent`, in `crates/agent`) is a small service installed
//! on a training machine. Studio is its only client: it uploads a dataset, asks
//! the agent to train, polls progress, and downloads the resulting weights.
//!
//! This crate is the contract both sides share — the request/response types
//! ([`protocol`]), the dataset/artifact archive format ([`archive`]), and the
//! client Studio uses ([`AgentClient`]). It is deliberately free of Tauri and of
//! any server framework so the desktop binary doesn't pull in the agent's
//! dependencies.

pub mod archive;
pub mod client;
pub mod error;
pub mod protocol;

pub use client::AgentClient;
pub use error::{AgentError, Result};
pub use protocol::*;
