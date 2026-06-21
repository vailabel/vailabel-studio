"""The copilot's local LLM/VLM configuration (port of `domain/config.rs`)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class LlmConfig:
    """A local OpenAI-compatible LLM/VLM the copilot uses for its conversational
    + vision replies (LM Studio, Ollama, llama.cpp).

    Built either from the user's saved config (Settings -> AI Copilot, forwarded
    by Rust) or by auto-discovery when no server is configured.
    """

    #: How this config was resolved: "manual" (saved settings) or "auto".
    provider: str
    #: Base URL including the `/v1` suffix, e.g. http://localhost:1234/v1.
    base_url: str
    model: str
    #: Whether the picked model accepts image input (VLM).
    vision: bool
