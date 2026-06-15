//! The copilot's local LLM/VLM configuration.

/// A local OpenAI-compatible LLM/VLM the copilot uses for its conversational +
/// vision replies (LM Studio, Ollama, llama.cpp). It is built on the backend
/// either from the user's saved config (Settings → AI Copilot) or by
/// auto-discovery when no server is configured — so it is constructed in Rust,
/// never deserialized raw from the webview.
#[derive(Debug, Clone)]
pub struct CopilotLlmConfig {
    /// How this config was resolved: "manual" (saved settings) or "auto".
    pub provider: String,
    /// Base URL including the `/v1` suffix, e.g. http://localhost:1234/v1.
    pub base_url: String,
    pub model: String,
    /// Whether the picked model accepts image input (VLM).
    pub vision: bool,
}
