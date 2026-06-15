//! Re-export shim: the pure copilot domain now lives in `vailabel-copilot`.
//!
//! The deterministic intent router, the LLM plan parser/validator, the QA-diff
//! engine, label-suggestion parsing, and `CopilotLlmConfig` moved to
//! [`vailabel_copilot::domain`] in Phase 5 (with their unit tests). This
//! re-export keeps the old `crate::ai::copilot::*` call sites — in
//! `service.rs`/`commands.rs` — working unchanged. The LLM/inference
//! orchestration that consumes this logic stays in `super::service::AiService`.

pub use vailabel_copilot::domain::*;
