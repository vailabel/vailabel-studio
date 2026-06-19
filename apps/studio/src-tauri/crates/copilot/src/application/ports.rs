//! The copilot's outbound ports.
//!
//! The application service ([`super::CopilotAppService`]) orchestrates a chat
//! turn against these two ports; the composition root implements them over the
//! local LLM client and the predictions/inference engine. The ports are **sync**
//! on purpose: the copilot LLM client is `reqwest::blocking` and the Tauri
//! commands already wrap copilot calls in `spawn_blocking`, so there is no
//! async/await (and no `async-trait`) here.
//!
//! ### Error convention (deliberate, to keep replies byte-identical)
//! - Methods whose failure is **propagated** to the frontend (the store reads,
//!   `detector_model_id`) return [`DomainResult`]: the binary maps the
//!   `DomainError` to its transport error.
//! - Methods whose failure is **shown to the user as reply text** (`chat`,
//!   `chat_json`, [`CopilotInference::detect`], [`CopilotInference::segment_boxes`])
//!   return `Result<_, String>` carrying the *bare* message. The pre-refactor
//!   code embedded the raw error message in the reply (e.g. "I couldn't run the
//!   detector: {error}"), so the port must not wrap it in a prefixed
//!   `DomainError` (`"repository error: …"`) — that would change the reply.

use serde_json::Value;
use vailabel_core::DomainResult;

use crate::domain::CopilotLlmConfig;

/// An axis-aligned box prompt fed to the segmentation model — the geometry the
/// app service derives from the detector's boxes before a segment-each step.
/// Mirrors the binary's `plugin::BoxPrompt`; the inference adapter maps between
/// the two.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct BoxPrompt {
    pub x1: f32,
    pub y1: f32,
    pub x2: f32,
    pub y2: f32,
}

/// The copilot's conversational + vision brain: a local OpenAI-compatible
/// LLM/VLM server (LM Studio, Ollama, llama.cpp). The composition-root impl owns
/// the resolution cache, reads the saved server settings + API key, and wraps
/// the blocking HTTP client. Everything stays on the user's machine.
pub trait CopilotLlm: Send + Sync {
    /// Resolve the LLM/VLM the copilot should use — a server saved in Settings →
    /// AI Copilot first, otherwise auto-discovery — cached briefly. `None` when
    /// no local server is reachable (the copilot then runs detector-only).
    fn resolve(&self) -> Option<CopilotLlmConfig>;

    /// Drop the cached resolution so the next [`resolve`](Self::resolve)
    /// re-probes. Called when a request to the server fails because it is gone.
    fn invalidate(&self);

    /// Whether the server at `base_url` still answers its `/models` endpoint —
    /// tells "server gone" (re-discover) apart from a bad request to a healthy
    /// server (keep the cache).
    fn server_reachable(&self, base_url: &str) -> bool;

    /// Chat/vision completion (the assistant text). `image_data_url` adds a
    /// vision content part when present. The impl supplies the saved API key.
    /// `Err` carries the bare, user-facing message.
    fn chat(
        &self,
        config: &CopilotLlmConfig,
        system: &str,
        user_text: &str,
        image_data_url: Option<&str>,
    ) -> Result<String, String>;

    /// Ask the model for a JSON object (temperature 0, JSON response format) —
    /// used to plan a turn. `Err` carries the bare message.
    fn chat_json(
        &self,
        config: &CopilotLlmConfig,
        system: &str,
        user_text: &str,
    ) -> Result<String, String>;

    /// Encode an image file as an OpenAI-style `data:` URL for vision messages,
    /// or `None` when the file can't be read.
    fn image_data_url(&self, path: &str) -> Option<String>;

    /// Validate a manual server config by probing its `/models`. `api_key` is the
    /// (optional) key the user just typed; the impl falls back to the saved key.
    /// Returns the reachable model ids, or a human-readable error message.
    fn test_connection(&self, base_url: &str, api_key: Option<&str>)
        -> Result<Vec<String>, String>;
}

/// The grounding side of the copilot: the on-device detector + segmentation
/// engine and the entity reads a turn needs. The composition-root impl wraps the
/// binary's `AiService` (shared predictions/pipeline engine, with its engine
/// cache and `predictions:generated` events) and a cloned `AppHandle`, so this
/// port is free of any Tauri/inference detail. Prediction geometry crosses the
/// boundary as JSON `Value`s (lossless — the pure domain already consumes that
/// shape).
pub trait CopilotInference: Send + Sync {
    /// The image entity, or `None` when it doesn't exist.
    fn image(&self, item_id: &str) -> DomainResult<Option<Value>>;

    /// The project's label classes (for routing targets + dedup of suggestions).
    fn project_labels(&self, project_id: &str) -> DomainResult<Vec<Value>>;

    /// The image's existing annotations (for the QA diff).
    fn annotations(&self, item_id: &str) -> DomainResult<Vec<Value>>;

    /// The image's current predictions (boxes the segment-each step outlines).
    fn predictions(&self, item_id: &str) -> DomainResult<Vec<Value>>;

    /// Id of the detector to run: the active AI model, else the first installed.
    fn detector_model_id(&self) -> DomainResult<Option<String>>;

    /// The active detector's class vocabulary, for extracting "find all X"
    /// targets even before the project has a matching label. Empty when no
    /// detector is installed.
    fn detector_class_names(&self) -> Vec<String>;

    /// Run the detector on the image, optionally filtered to one class. The
    /// returned prediction JSON has already been persisted and a
    /// `predictions:generated` event emitted by the impl. `Err` carries the bare
    /// message (it is surfaced in the reply).
    fn detect(
        &self,
        item_id: &str,
        model_id: &str,
        target: Option<&str>,
    ) -> Result<Vec<Value>, String>;

    /// Segment the given boxes with the installed segmentation (SAM) model,
    /// surfacing polygon predictions. Resolves the SAM model id internally and
    /// errors (bare message) when none is installed. `Err` is surfaced in the
    /// reply.
    fn segment_boxes(
        &self,
        item_id: &str,
        boxes: Vec<BoxPrompt>,
        target: Option<&str>,
    ) -> Result<Vec<Value>, String>;
}
