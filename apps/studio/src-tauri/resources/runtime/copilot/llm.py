"""OpenAI-compatible client for a local LLM/VLM server (LM Studio, Ollama,
llama.cpp, ...). The copilot's conversational + vision brain. Faithful port of
the binary's `features/ai/llm.rs` + the resolution cache from `BinaryCopilotLlm`.

Uses only the standard library (urllib) so the copilot core needs no third-party
dependency and stays importable/testable with a bare Python.

Everything runs against a server on the user's own machine, so the offline-first
guarantee holds -- there is no first-party cloud call here. Secrets (the API key)
are forwarded per-turn by Rust, which owns the keychain; they are never stored.
"""

from __future__ import annotations

import base64
import json
import os
import time
import urllib.error
import urllib.request
from typing import Any

from .config import LlmConfig


class LlmError(Exception):
    """A user-facing LLM failure carrying the *bare* message (no prefix), so the
    orchestrator can surface it as reply text byte-for-byte like the Rust path."""


#: Max characters of document text fed to the LLM in one turn.
_MAX_TEXT_CHARS = 8_000

#: Default OpenAI-compatible local servers the copilot probes, in priority order:
#: LM Studio, Ollama, llama.cpp, Jan.
DEFAULT_LOCAL_SERVERS = (
    "http://localhost:1234/v1",  # LM Studio
    "http://localhost:11434/v1",  # Ollama (OpenAI-compatible API)
    "http://localhost:8080/v1",  # llama.cpp server
    "http://localhost:1337/v1",  # Jan
)

#: Substrings in a model id that hint it can see images.
VISION_MODEL_HINTS = (
    "vl", "vision", "llava", "moondream", "florence", "minicpm-v", "pixtral",
    "internvl", "smolvlm", "gemma-3", "gemma3", "qwen2-vl", "qwen2.5-vl",
    "phi-3-vision", "phi-3.5-vision", "multimodal", "molmo", "idefics", "glm-4v",
    "paligemma", "kosmos",
)

#: How long an auto-discovered local LLM is trusted before re-probing.
_CACHE_TTL_S = 30.0


# ------------------------------- URL helpers --------------------------------


def _resolve_base(base_url: str) -> str:
    base = base_url.strip().rstrip("/")
    if base.endswith("/chat/completions"):
        return base[: -len("/chat/completions")].rstrip("/")
    if base.endswith("/v1"):
        return base
    return f"{base}/v1"


def _chat_endpoint(base_url: str) -> str:
    return f"{_resolve_base(base_url)}/chat/completions"


def _models_endpoint(base_url: str) -> str:
    return f"{_resolve_base(base_url)}/models"


def image_data_url(path: str) -> str | None:
    """Encode an image file as an OpenAI-style `data:` URL for vision messages."""
    try:
        with open(path, "rb") as handle:
            raw = handle.read()
    except OSError:
        return None
    ext = os.path.splitext(path)[1].lower().lstrip(".")
    mime = {
        "png": "image/png",
        "webp": "image/webp",
        "gif": "image/gif",
        "bmp": "image/bmp",
    }.get(ext, "image/jpeg")
    return f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"


def read_text_file(path: str) -> str | None:
    """Read a text item's document as UTF-8, truncated to a sane cap, for grounding
    the copilot's chat. Returns `None` when the file can't be read or is empty."""
    try:
        with open(path, "rb") as handle:
            raw = handle.read()
    except OSError:
        return None
    text = raw.decode("utf-8", errors="replace").strip()
    if not text:
        return None
    if len(text) > _MAX_TEXT_CHARS:
        return text[:_MAX_TEXT_CHARS] + "\n…[truncated]"
    return text


# --------------------------- low-level HTTP ----------------------------------


def _http_json(
    method: str,
    url: str,
    api_key: str | None,
    body: dict[str, Any] | None,
    timeout: float,
) -> tuple[int, Any]:
    """Send a JSON request and return `(status, parsed_body_or_text)`. Raises
    `urllib.error.URLError`/`OSError` when the server can't be reached."""
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"}
    if api_key and api_key.strip():
        headers["Authorization"] = f"Bearer {api_key.strip()}"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = response.read()
            status = response.status
    except urllib.error.HTTPError as exc:  # non-2xx still has a body
        return exc.code, exc.read().decode("utf-8", errors="replace")
    try:
        return status, json.loads(payload)
    except (ValueError, TypeError):
        return status, payload.decode("utf-8", errors="replace")


def _looks_like_vision_model(model: str) -> bool:
    lower = model.lower()
    return any(hint in lower for hint in VISION_MODEL_HINTS)


def _pick_model(models: list[str]) -> tuple[str, bool] | None:
    """Pick the model the copilot should use: a vision-capable one when available,
    otherwise the first model. Returns `(model_id, is_vision)`."""
    for model in models:
        if _looks_like_vision_model(model):
            return model, True
    if models:
        return models[0], False
    return None


def _parse_model_ids(payload: Any) -> list[str]:
    if not isinstance(payload, dict):
        return []
    data = payload.get("data")
    if not isinstance(data, list):
        return []
    out = []
    for entry in data:
        if isinstance(entry, dict) and isinstance(entry.get("id"), str):
            out.append(entry["id"])
    return out


def _probe_models(base_url: str, api_key: str | None = None) -> list[str] | None:
    """Quickly probe a server's `/models`; return its model ids if reachable."""
    try:
        status, payload = _http_json(
            "GET", _models_endpoint(base_url), api_key, None, timeout=3.0
        )
    except (urllib.error.URLError, OSError):
        return None
    if status < 200 or status >= 300:
        return None
    models = _parse_model_ids(payload)
    return models or None


def server_reachable(base_url: str) -> bool:
    """True if a server's `/models` endpoint still answers."""
    return _probe_models(base_url) is not None


def discover_local_llm() -> LlmConfig | None:
    """Auto-discover a local OpenAI-compatible server + model for the copilot."""
    for base_url in DEFAULT_LOCAL_SERVERS:
        models = _probe_models(base_url)
        if models:
            picked = _pick_model(models)
            if picked:
                model, vision = picked
                return LlmConfig("auto", base_url, model, vision)
    return None


def _vision_pref(value: str | None) -> str:
    """Normalize the `copilot.vision` setting. Anything unrecognized is "auto"."""
    v = (value or "auto").strip().lower()
    if v in ("on", "true", "yes"):
        return "on"
    if v in ("off", "false", "no"):
        return "off"
    return "auto"


def configure_llm(
    base_url: str | None, model: str | None, vision_pref: str, api_key: str | None
) -> LlmConfig | None:
    """Build a copilot LLM config from an explicit server (Settings -> AI Copilot)."""
    base = (base_url or "").strip()
    if not base:
        return None
    pinned = (model or "").strip()
    if pinned:
        looks_vision = _looks_like_vision_model(pinned)
        chosen = pinned
    else:
        models = _probe_models(base, api_key)
        if not models:
            return None
        picked = _pick_model(models)
        if not picked:
            return None
        chosen, looks_vision = picked
    vision = True if vision_pref == "on" else False if vision_pref == "off" else looks_vision
    return LlmConfig("manual", base, chosen, vision)


def test_connection(base_url: str, api_key: str | None) -> list[str]:
    """Validate a manual copilot server config by probing its `/models`. Returns the
    reachable model ids, or raises `LlmError` with a human-readable reason."""
    base = base_url.strip()
    if not base:
        raise LlmError("Enter a server URL first.")
    endpoint = _models_endpoint(base)
    try:
        status, payload = _http_json("GET", endpoint, api_key, None, timeout=5.0)
    except (urllib.error.URLError, OSError) as exc:
        raise LlmError(
            f"Couldn't reach {endpoint} ({exc}). Is the server running (e.g. LM Studio "
            "→ Developer → Start Server)?"
        )
    if status < 200 or status >= 300:
        detail = payload if isinstance(payload, str) else json.dumps(payload)
        raise LlmError(f"Server returned {status}: {detail[:200]}")
    if not isinstance(payload, dict):
        raise LlmError("Server replied with a non-JSON body.")
    models = _parse_model_ids(payload)
    if not models:
        raise LlmError(
            "Server reachable, but it reported no loaded models. Load a model first."
        )
    return models


# ----------------------------- chat completion -------------------------------


def _chat_send(
    config: LlmConfig,
    api_key: str | None,
    system: str,
    user_content: Any,
    temperature: float,
    json_mode: bool,
) -> str:
    body: dict[str, Any] = {
        "model": config.model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        "temperature": temperature,
        "stream": False,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    url = _chat_endpoint(config.base_url)
    try:
        status, payload = _http_json("POST", url, api_key, body, timeout=180.0)
    except (urllib.error.URLError, OSError) as exc:
        raise LlmError(
            f"Couldn't reach the local model server at {url} ({exc}). Is the server "
            "running (e.g. LM Studio → Developer → Start Server)?"
        )
    if status < 200 or status >= 300:
        detail = payload if isinstance(payload, str) else json.dumps(payload)
        raise LlmError(f"Local model server returned {status}: {detail[:300]}")
    content = _extract_choice_text(payload)
    if not content:
        raise LlmError("The local model returned an empty response.")
    return content


def _extract_choice_text(payload: Any) -> str | None:
    if not isinstance(payload, dict):
        return None
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    content = message.get("content") if isinstance(message, dict) else None
    if isinstance(content, str):
        stripped = content.strip()
        return stripped or None
    return None


def _extract_choice_message(payload: Any) -> dict[str, Any] | None:
    """The full assistant message (content + any `tool_calls`) for the agent loop."""
    if not isinstance(payload, dict):
        return None
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    return message if isinstance(message, dict) else None


def _chat_messages(
    config: LlmConfig,
    api_key: str | None,
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None,
    temperature: float,
) -> dict[str, Any]:
    """Multi-message chat with optional tool/function-calling. Returns the raw
    assistant message dict (may carry `tool_calls`). `Err` → `LlmError`."""
    body: dict[str, Any] = {
        "model": config.model,
        "messages": messages,
        "temperature": temperature,
        "stream": False,
    }
    if tools:
        body["tools"] = tools
        body["tool_choice"] = "auto"

    url = _chat_endpoint(config.base_url)
    try:
        status, payload = _http_json("POST", url, api_key, body, timeout=180.0)
    except (urllib.error.URLError, OSError) as exc:
        raise LlmError(
            f"Couldn't reach the local model server at {url} ({exc}). Is the server "
            "running (e.g. LM Studio → Developer → Start Server)?"
        )
    if status < 200 or status >= 300:
        detail = payload if isinstance(payload, str) else json.dumps(payload)
        raise LlmError(f"Local model server returned {status}: {detail[:300]}")
    message = _extract_choice_message(payload)
    if message is None:
        raise LlmError("The local model returned an empty response.")
    return message


# ------------------------- the orchestrator-facing port ----------------------


class LocalLlm:
    """Resolves + talks to the copilot's local LLM. Mirrors the Rust `CopilotLlm`
    port the orchestrator depends on. Constructed per turn from the settings Rust
    forwards (saved base_url/model/vision + the keychain API key); a tiny
    process-level cache mirrors the Rust 30s discovery TTL."""

    # Shared across turns so back-to-back requests don't re-probe every server.
    _cache: dict[str, Any] = {}

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        vision: str | None = None,
        api_key: str | None = None,
    ) -> None:
        self._base_url = (base_url or "").strip() or None
        self._model = (model or "").strip() or None
        self._vision_pref = _vision_pref(vision)
        self._api_key = api_key

    def _signature(self) -> str:
        return f"{self._base_url or ''}|{self._model or ''}|{self._vision_pref}"

    def resolve(self) -> LlmConfig | None:
        signature = self._signature()
        entry = LocalLlm._cache.get(signature)
        if entry is not None and (time.monotonic() - entry["at"]) < _CACHE_TTL_S:
            return entry["config"]

        if self._base_url:
            config = configure_llm(
                self._base_url, self._model, self._vision_pref, self._api_key
            ) or discover_local_llm()
        else:
            config = discover_local_llm()

        if config is not None and self._vision_pref != "auto":
            config = LlmConfig(
                config.provider,
                config.base_url,
                config.model,
                self._vision_pref == "on",
            )

        LocalLlm._cache[signature] = {"config": config, "at": time.monotonic()}
        return config

    def invalidate(self) -> None:
        LocalLlm._cache.pop(self._signature(), None)

    def server_reachable(self, base_url: str) -> bool:
        return server_reachable(base_url)

    def chat(
        self,
        config: LlmConfig,
        system: str,
        user_text: str,
        image_data_url_: str | None = None,
    ) -> str:
        if image_data_url_:
            user_content: Any = [
                {"type": "text", "text": user_text},
                {"type": "image_url", "image_url": {"url": image_data_url_}},
            ]
        else:
            user_content = user_text
        return _chat_send(config, self._api_key, system, user_content, 0.2, False)

    def chat_json(self, config: LlmConfig, system: str, user_text: str) -> str:
        return _chat_send(config, self._api_key, system, user_text, 0.0, True)

    def chat_messages(
        self,
        config: LlmConfig,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Multi-turn chat with optional tool-calling — the agent loop's primitive.
        Returns the assistant message dict (content + any `tool_calls`)."""
        return _chat_messages(config, self._api_key, messages, tools, 0.2)

    def image_data_url(self, path: str) -> str | None:
        return image_data_url(path)

    def read_text_file(self, path: str) -> str | None:
        return read_text_file(path)

    def test_connection(self, base_url: str, api_key: str | None) -> list[str]:
        key = (api_key or "").strip() or self._api_key
        return test_connection(base_url, key)
