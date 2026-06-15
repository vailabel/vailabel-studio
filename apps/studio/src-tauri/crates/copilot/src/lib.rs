//! `vailabel-copilot` — the Copilot module.
//!
//! The offline AI labeling copilot: chat, tool calling, prompt/session
//! management, AI actions, and the approval workflow. Phase 1 extracts the pure
//! request/response DTOs (the chat-turn payload, the approved-action payload,
//! and the connection-test payload/result) into [`contracts`]. The
//! `CopilotSession`/`CopilotMessage` aggregates, `ToolExecution`, capability
//! routing, and LLM orchestration remain in the binary (coupled to HTTP and the
//! inference engines) and migrate in later phases.

pub mod contracts;
