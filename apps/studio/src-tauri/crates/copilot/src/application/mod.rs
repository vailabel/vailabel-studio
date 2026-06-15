//! The copilot application layer: the use-case service that orchestrates a chat
//! turn, plus the outbound ports it depends on.
//!
//! [`CopilotAppService`] transcribes the pre-refactor `AiService` copilot
//! orchestration — turn → plan → dispatch/execute → the per-capability handlers
//! + `test_connection` — against [`ports`]. It stays pure: no HTTP, no Tauri, no
//! inference engines; those live behind the ports, implemented at the
//! composition root.

pub mod ports;
pub mod service;

pub use ports::{BoxPrompt, CopilotInference, CopilotLlm};
pub use service::CopilotAppService;
