//! `vailabel-copilot` — the Copilot module.
//!
//! The offline AI labeling copilot: chat, tool calling, AI actions, and the
//! approval workflow. [`contracts`] holds the command request/response DTOs (the
//! chat-turn payload, the approved-action payload, and the connection-test
//! payload/result). [`domain`] holds the pure decision logic the copilot is
//! built on — the deterministic intent router, the LLM plan parser/validator,
//! the QA-diff engine, label-suggestion parsing, and the [`CopilotLlmConfig`].
//! It is pure: no HTTP, no Tauri, no inference engines. Tool execution + LLM and
//! inference orchestration move into the application layer (later phases),
//! depending on ports the binary implements.
//!
//! [`CopilotLlmConfig`]: domain::CopilotLlmConfig

pub mod application;
pub mod contracts;
pub mod domain;
