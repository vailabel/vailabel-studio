//! The copilot application layer: the use-case service that orchestrates a chat
//! turn, plus the outbound ports it depends on.
//!
//! The service (added in a follow-up step) transcribes the pre-refactor
//! `AiService` copilot orchestration — turn → plan → dispatch/execute → the
//! per-capability handlers + `test_connection` — against [`ports`]. It stays
//! pure: no HTTP, no Tauri, no inference engines; those live behind the ports,
//! implemented at the composition root.

pub mod ports;

pub use ports::{BoxPrompt, CopilotInference, CopilotLlm};
