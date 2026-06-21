"""The agentic tool-use loop — the copilot's "very good" brain.

Instead of the one-shot keyword/plan router, the LLM drives a multi-step loop:
it picks a tool, sees the *real* result (detector counts, QA findings, …), then
either calls another tool or writes a final, grounded answer. This is the
"LLM uses the copilot like MCP" design.

Pure orchestration — it depends only on an `llm` with `chat_messages` and an
`execute(name, args) -> dict` callback the orchestrator supplies (which runs the
detector/SAM/etc. and accumulates the predictions/findings/actions). The loop is
bounded by `max_iters`; the keyword router remains the fallback when no LLM is
available or a call fails (handled by the caller).
"""

from __future__ import annotations

import json
import re
from typing import Any, Callable

#: Hard cap on tool-call rounds per turn, so a confused model can't loop forever.
MAX_ITERS = 5

#: Tool-template markers some local models leak into their reply text instead of
#: writing a sentence (e.g. "[TOOL_RESULT] 12 [END_TOOL_RESULT]", "<tool_call>…",
#: "<|python_tag|>"). They are stripped so the user never sees raw template tokens.
_TOOL_ARTIFACT_RE = re.compile(
    r"\[/?(?:END_)?TOOL[A-Z_]*\]"  # [TOOL_RESULT] [END_TOOL_RESULT] [TOOL_CALLS] [/TOOL_CALLS]
    r"|</?tool[_a-z]*>"  # <tool_call> </tool_call> <tool_response>
    r"|<\|[^|]*\|>",  # <|tool_call|> <|python_tag|> <|im_end|>
    re.IGNORECASE,
)


def _clean_reply(text: str | None) -> str:
    """Strip leaked tool-template markers and trim. The caller decides whether the
    result is a usable sentence or should be replaced with a grounded summary."""
    if not text:
        return ""
    return _TOOL_ARTIFACT_RE.sub("", text).strip()


def run_agent(
    llm: Any,
    config: Any,
    system: str,
    history: list[dict[str, Any]],
    user_message: str,
    image_url: str | None,
    tools: list[dict[str, Any]],
    execute: Callable[[str, dict[str, Any]], dict[str, Any]],
    max_iters: int = MAX_ITERS,
) -> str:
    """Run the tool-calling loop and return the final assistant reply.

    `execute` runs one tool and returns a JSON-serializable result (and, as a side
    effect in the caller's closure, accumulates any predictions/findings/actions).
    Raises `LlmError` (from `llm.chat_messages`) on a transport failure so the
    caller can fall back to deterministic routing.
    """
    messages: list[dict[str, Any]] = [{"role": "system", "content": system}]
    for entry in history:
        role = entry.get("role")
        content = entry.get("content")
        if role in ("user", "assistant") and isinstance(content, str) and content.strip():
            messages.append({"role": role, "content": content})

    if image_url:
        messages.append(
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_message},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        )
    else:
        messages.append({"role": "user", "content": user_message})

    for _ in range(max_iters):
        assistant = llm.chat_messages(config, messages, tools or None)
        tool_calls = assistant.get("tool_calls") if isinstance(assistant, dict) else None

        # Echo the assistant turn back into the transcript (content may be null when
        # it only emitted tool calls). Keep `tool_calls` so the server can match the
        # following tool results to them.
        echoed: dict[str, Any] = {"role": "assistant", "content": assistant.get("content")}
        if tool_calls:
            echoed["tool_calls"] = tool_calls
        messages.append(echoed)

        if not tool_calls:
            return _clean_reply(assistant.get("content"))

        for call in tool_calls:
            function = call.get("function", {}) if isinstance(call, dict) else {}
            name = function.get("name", "")
            try:
                args = json.loads(function.get("arguments") or "{}")
            except (ValueError, TypeError):
                args = {}
            if not isinstance(args, dict):
                args = {}
            result = execute(name, args)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.get("id"),
                    "content": json.dumps(result),
                }
            )

    # Out of tool rounds — force a final answer with the tools removed.
    final = llm.chat_messages(config, messages, None)
    return _clean_reply(final.get("content") if isinstance(final, dict) else None)
