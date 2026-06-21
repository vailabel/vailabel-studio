//! Copilot wire DTOs (request payloads + results).
//!
//! These moved here from the `vailabel_copilot` crate when the copilot core was
//! migrated to the Python runtime; the crate was then removed. The copilot's
//! brain (routing/planning/QA/LLM/orchestration) now lives in
//! `resources/runtime/copilot/`, and the Rust side only deserializes these
//! payloads, calls the runtime, and persists the drafts it returns.
//!
//! A turn's `findings` and `proposedActions` are produced in Python in their
//! final wire shape, so [`CopilotTurnResult`] passes them straight through as
//! JSON. Everything serializes identically to the old crate types, so the
//! frontend contract is unchanged.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// One chat turn for the local AI copilot. The copilot auto-discovers the local
/// model itself, so the client sends no LLM configuration.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopilotTurnPayload {
    pub project_id: Option<String>,
    pub item_id: String,
    pub message: String,
    /// Prior chat turns (`[{role, content}]`, user/assistant) for the agent's
    /// conversation memory. Optional/best-effort; older clients omit it.
    #[serde(default)]
    pub history: Option<Vec<Value>>,
    /// The project's data modality (`image`/`text`/`audio`/`tabular`/`video`/
    /// `custom`). `None`/`"image"` runs the full image pipeline; any other value
    /// runs the LLM-driven generic path. Older clients omit it.
    #[serde(default)]
    pub modality: Option<String>,
    /// The project's labeling task (e.g. `ner`, `text_classification`), used to
    /// tailor the generic path's prompts. Optional/best-effort.
    #[serde(default)]
    pub task: Option<String>,
    /// Tool ids the user enabled in the copilot's Tools menu. `None`/empty = all
    /// on (back-compat); a disabled tool is never run, even if the message asks.
    #[serde(default)]
    pub enabled_tools: Option<Vec<String>>,
}

/// A human-approved mutation the copilot proposed (relabel / delete / new label).
/// Tagged by `kind` so the frontend can round-trip a proposed action back.
#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum CopilotActionPayload {
    #[serde(rename_all = "camelCase")]
    Relabel {
        annotation_id: String,
        to_label: String,
    },
    #[serde(rename_all = "camelCase")]
    Delete { annotation_id: String },
    #[serde(rename_all = "camelCase")]
    CreateLabel {
        name: String,
        #[serde(default)]
        color: Option<String>,
        project_id: String,
    },
}

/// Probe a manual copilot server config (Settings → AI Copilot) before relying on
/// it for a turn. `api_key` lets the UI test a key the user just typed but hasn't
/// saved to the keychain yet; when absent the saved key is used.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopilotTestPayload {
    pub base_url: String,
    #[serde(default)]
    pub api_key: Option<String>,
}

/// Result of `ai_copilot_test_connection`: whether the server answered and the
/// model ids it reported (so the UI can offer them as choices).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CopilotTestResult {
    pub ok: bool,
    pub message: String,
    pub models: Vec<String>,
}

/// Result of one copilot chat turn. `findings` and `proposedActions` are the
/// JSON the Python copilot produced; `predictionsAdded` is the count the Rust
/// bridge persisted.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CopilotTurnResult {
    pub reply: String,
    pub capability: String,
    pub predictions_added: usize,
    pub findings: Vec<Value>,
    pub proposed_actions: Vec<Value>,
}
