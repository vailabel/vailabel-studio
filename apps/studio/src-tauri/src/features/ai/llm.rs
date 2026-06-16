//! OpenAI-compatible client for a local LLM/VLM server (LM Studio, Ollama,
//! llama.cpp, …). This is the copilot's conversational + vision brain; it runs
//! against a server on the user's own machine, so the offline-first guarantee
//! holds — there is no first-party cloud call here.

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use reqwest::blocking::Client;
use serde_json::{json, Value};
use std::path::Path;
use std::time::Duration;

use crate::features::ai::model::CopilotLlmConfig;
use crate::AppError;

/// Normalize whatever the user typed to the OpenAI `/v1` base. Accepts a bare
/// host (`http://localhost:1234`), a `/v1` base, or a full chat endpoint.
fn resolve_base(base_url: &str) -> String {
    let base = base_url.trim().trim_end_matches('/');
    if let Some(stripped) = base.strip_suffix("/chat/completions") {
        stripped.trim_end_matches('/').to_string()
    } else if base.ends_with("/v1") {
        base.to_string()
    } else {
        format!("{base}/v1")
    }
}

fn chat_endpoint(base_url: &str) -> String {
    format!("{}/chat/completions", resolve_base(base_url))
}

fn models_endpoint(base_url: &str) -> String {
    format!("{}/models", resolve_base(base_url))
}

/// Encode an image file as an OpenAI-style `data:` URL for vision messages.
pub fn image_data_url(path: &str) -> Option<String> {
    let bytes = std::fs::read(path).ok()?;
    let mime = match Path::new(path)
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("webp") => "image/webp",
        Some("gif") => "image/gif",
        Some("bmp") => "image/bmp",
        _ => "image/jpeg",
    };
    Some(format!("data:{mime};base64,{}", BASE64.encode(bytes)))
}

/// Call an OpenAI-compatible `/chat/completions` endpoint and return the
/// assistant text. `image_data_url` adds a vision content part when present.
pub fn chat_completion(
    config: &CopilotLlmConfig,
    api_key: Option<&str>,
    system: &str,
    user_text: &str,
    image_data_url: Option<&str>,
) -> Result<String, AppError> {
    let user_content = match image_data_url {
        Some(url) => json!([
            { "type": "text", "text": user_text },
            { "type": "image_url", "image_url": { "url": url } },
        ]),
        None => Value::String(user_text.to_string()),
    };
    chat_send(config, api_key, system, user_content, 0.2, false)
}

/// Ask the local model for a JSON object (temperature 0, `response_format` JSON).
/// Used by the copilot's orchestrator to plan a turn; the caller validates the
/// result and falls back to deterministic routing if it fails or is non-JSON.
pub fn chat_json(
    config: &CopilotLlmConfig,
    api_key: Option<&str>,
    system: &str,
    user_text: &str,
) -> Result<String, AppError> {
    chat_send(
        config,
        api_key,
        system,
        Value::String(user_text.to_string()),
        0.0,
        true,
    )
}

/// Shared `/chat/completions` request: builds the body, posts, extracts the
/// assistant text. `json_mode` sets `response_format` so servers that honor it
/// constrain the output to a JSON object.
fn chat_send(
    config: &CopilotLlmConfig,
    api_key: Option<&str>,
    system: &str,
    user_content: Value,
    temperature: f32,
    json_mode: bool,
) -> Result<String, AppError> {
    let mut body = json!({
        "model": config.model,
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": user_content },
        ],
        "temperature": temperature,
        "stream": false,
    });
    if json_mode {
        body["response_format"] = json!({ "type": "json_object" });
    }

    let client = Client::builder()
        .connect_timeout(Duration::from_secs(5))
        // Local generation can be slow on CPU; allow a generous ceiling.
        .timeout(Duration::from_secs(180))
        .build()?;

    let url = chat_endpoint(&config.base_url);
    let mut request = client.post(&url).json(&body);
    if let Some(key) = api_key.filter(|key| !key.trim().is_empty()) {
        request = request.bearer_auth(key);
    }

    let response = request.send().map_err(|error| {
        AppError::Message(format!(
            "Couldn't reach the local model server at {url} ({error}). Is the server running (e.g. \
             LM Studio \u{2192} Developer \u{2192} Start Server)?"
        ))
    })?;

    if !response.status().is_success() {
        let status = response.status();
        let detail = response.text().unwrap_or_default();
        return Err(AppError::Message(format!(
            "Local model server returned {status}: {}",
            detail.chars().take(300).collect::<String>()
        )));
    }

    let payload: Value = response.json()?;
    let content = payload
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(ToString::to_string)
        .ok_or_else(|| AppError::Message("The local model returned an empty response.".into()))?;

    Ok(content)
}

/// Quick reachability check for a server we already discovered — true if its
/// `/models` endpoint still answers. Lets the copilot tell "server gone"
/// (re-discover) apart from a bad request to a healthy server (keep the cache).
pub fn server_reachable(base_url: &str) -> bool {
    probe_models(base_url).is_some()
}

/// Default OpenAI-compatible local servers the copilot probes, in priority
/// order: LM Studio, Ollama, llama.cpp, Jan. The user runs one of these on their
/// own machine; the copilot finds it and picks a model with no configuration.
const DEFAULT_LOCAL_SERVERS: &[&str] = &[
    "http://localhost:1234/v1", // LM Studio
    "http://localhost:11434/v1", // Ollama (OpenAI-compatible API)
    "http://localhost:8080/v1", // llama.cpp server
    "http://localhost:1337/v1", // Jan
];

/// Substrings in a model id that hint it can see images, so the copilot can
/// prefer a vision-language model when one is loaded.
const VISION_MODEL_HINTS: &[&str] = &[
    "vl",
    "vision",
    "llava",
    "moondream",
    "florence",
    "minicpm-v",
    "pixtral",
    "internvl",
    "smolvlm",
    "gemma-3",
    "gemma3",
    "qwen2-vl",
    "qwen2.5-vl",
    "phi-3-vision",
    "phi-3.5-vision",
    "multimodal",
    "molmo",
    "idefics",
    "glm-4v",
    "paligemma",
    "kosmos",
];

fn looks_like_vision_model(model: &str) -> bool {
    let lower = model.to_lowercase();
    VISION_MODEL_HINTS.iter().any(|hint| lower.contains(hint))
}

/// Pick the model the copilot should use from a server's list: a vision-capable
/// one when available (so it can see the current image), otherwise the first
/// model. Returns `(model_id, is_vision)`.
fn pick_model(models: &[String]) -> Option<(String, bool)> {
    if let Some(vision) = models.iter().find(|model| looks_like_vision_model(model)) {
        return Some((vision.clone(), true));
    }
    models.first().map(|model| (model.clone(), false))
}

/// Extract the model ids from an OpenAI-compatible `/models` response body.
fn parse_model_ids(payload: &Value) -> Vec<String> {
    payload
        .get("data")
        .and_then(Value::as_array)
        .map(|entries| {
            entries
                .iter()
                .filter_map(|entry| {
                    entry.get("id").and_then(Value::as_str).map(ToString::to_string)
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

/// Quickly probe a single server's `/models` endpoint; returns its model ids if
/// reachable. Uses short timeouts so probing a server that's down doesn't stall
/// a chat turn. `api_key` adds a bearer header for servers that require auth.
fn probe_models_with(base_url: &str, api_key: Option<&str>) -> Option<Vec<String>> {
    let client = Client::builder()
        .connect_timeout(Duration::from_millis(700))
        .timeout(Duration::from_secs(3))
        .build()
        .ok()?;
    let mut request = client.get(models_endpoint(base_url));
    if let Some(key) = api_key.filter(|key| !key.trim().is_empty()) {
        request = request.bearer_auth(key);
    }
    let response = request.send().ok()?;
    if !response.status().is_success() {
        return None;
    }
    let payload: Value = response.json().ok()?;
    let models = parse_model_ids(&payload);
    if models.is_empty() {
        None
    } else {
        Some(models)
    }
}

fn probe_models(base_url: &str) -> Option<Vec<String>> {
    probe_models_with(base_url, None)
}

/// Auto-discover a local OpenAI-compatible server + model for the copilot. The
/// copilot picks the model itself — there is no manual configuration. Returns
/// `None` when no local server is reachable, in which case the copilot falls
/// back to its detector-only behavior. Everything stays on the user's machine.
pub fn discover_local_llm() -> Option<CopilotLlmConfig> {
    for base_url in DEFAULT_LOCAL_SERVERS {
        if let Some(models) = probe_models(base_url) {
            if let Some((model, vision)) = pick_model(&models) {
                return Some(CopilotLlmConfig {
                    provider: "auto".to_string(),
                    base_url: (*base_url).to_string(),
                    model,
                    vision,
                });
            }
        }
    }
    None
}

/// How a manually configured copilot should treat image (vision) input.
#[derive(Debug, Clone, Copy)]
pub enum VisionPref {
    /// Infer from the model id (a VLM-looking name accepts images).
    Auto,
    /// Always send the current image (the user knows the model is a VLM).
    On,
    /// Never send images (text-only model).
    Off,
}

impl VisionPref {
    /// Parse the `copilot.vision` setting value. Anything unrecognized is `Auto`.
    pub fn from_setting(value: &str) -> Self {
        match value.trim().to_lowercase().as_str() {
            "on" | "true" | "yes" => Self::On,
            "off" | "false" | "no" => Self::Off,
            _ => Self::Auto,
        }
    }

    /// Override a resolved config's vision flag with an explicit preference.
    /// `Auto` leaves the name-based guess in place; `On`/`Off` force it — so a
    /// VLM whose id the heuristic doesn't recognize still gets the image.
    pub fn apply(self, vision: &mut bool) {
        match self {
            Self::On => *vision = true,
            Self::Off => *vision = false,
            Self::Auto => {}
        }
    }
}

/// Build a copilot LLM config from an explicit server (Settings → AI Copilot).
/// When no model is pinned, the server's `/models` is probed and a model picked
/// (preferring a vision-capable one). Returns `None` when the server is empty,
/// or unreachable with no pinned model — the caller then falls back to
/// auto-discovery so the copilot still works.
pub fn configure_llm(
    base_url: &str,
    model: Option<&str>,
    vision: VisionPref,
    api_key: Option<&str>,
) -> Option<CopilotLlmConfig> {
    let base_url = base_url.trim();
    if base_url.is_empty() {
        return None;
    }
    let pinned = model.map(str::trim).filter(|model| !model.is_empty());
    let (model, looks_vision) = match pinned {
        // Trust an explicitly pinned model even without probing — a transient
        // server hiccup shouldn't drop us back to auto-discovery.
        Some(model) => (model.to_string(), looks_like_vision_model(model)),
        None => pick_model(&probe_models_with(base_url, api_key)?)?,
    };
    let vision = match vision {
        VisionPref::On => true,
        VisionPref::Off => false,
        VisionPref::Auto => looks_vision,
    };
    Some(CopilotLlmConfig {
        provider: "manual".to_string(),
        base_url: base_url.to_string(),
        model,
        vision,
    })
}

/// Validate a manual copilot server config by probing its `/models`. Returns the
/// reachable model ids on success, or a human-readable error explaining why it
/// failed (so the settings UI can surface the exact problem).
pub fn test_connection(base_url: &str, api_key: Option<&str>) -> Result<Vec<String>, String> {
    let base_url = base_url.trim();
    if base_url.is_empty() {
        return Err("Enter a server URL first.".to_string());
    }
    let endpoint = models_endpoint(base_url);
    let client = Client::builder()
        .connect_timeout(Duration::from_millis(1500))
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|error| error.to_string())?;
    let mut request = client.get(&endpoint);
    if let Some(key) = api_key.filter(|key| !key.trim().is_empty()) {
        request = request.bearer_auth(key);
    }
    let response = request.send().map_err(|error| {
        format!(
            "Couldn't reach {endpoint} ({error}). Is the server running (e.g. LM Studio \u{2192} \
             Developer \u{2192} Start Server)?"
        )
    })?;
    if !response.status().is_success() {
        let status = response.status();
        let detail = response.text().unwrap_or_default();
        return Err(format!(
            "Server returned {status}: {}",
            detail.chars().take(200).collect::<String>()
        ));
    }
    let payload: Value = response
        .json()
        .map_err(|error| format!("Server replied with a non-JSON body: {error}"))?;
    let models = parse_model_ids(&payload);
    if models.is_empty() {
        Err("Server reachable, but it reported no loaded models. Load a model first.".to_string())
    } else {
        Ok(models)
    }
}
