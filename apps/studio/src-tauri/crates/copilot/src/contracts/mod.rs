//! Request/response contracts for the copilot commands.

use serde::{Deserialize, Serialize};

/// One chat turn for the local AI copilot. The copilot auto-discovers the local
/// model itself, so the client sends no LLM configuration.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopilotTurnPayload {
    pub project_id: Option<String>,
    pub item_id: String,
    pub message: String,
    /// Tool ids the user has enabled in the copilot's Tools menu (matching
    /// `Capability::as_str`). `None`/empty = all tools on (back-compat); a
    /// disabled tool is never run, even if the message asks for it.
    #[serde(default)]
    pub enabled_tools: Option<Vec<String>>,
}

/// A human-approved mutation the copilot proposed (relabel / delete / new label).
/// Tagged by `kind` so the frontend can round-trip a `ProposedAction` back.
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

/// Probe a manual copilot server config (Settings → AI Copilot) before relying
/// on it for a turn. `api_key` lets the UI test a key the user just typed but
/// hasn't saved to the keychain yet; when absent the saved key is used.
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
