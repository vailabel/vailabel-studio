"""Tool specs for the agentic copilot loop (OpenAI function-calling schema).

These describe the copilot's *grounded* capabilities to the LLM so it can call
them itself (the "LLM uses the copilot like MCP" idea), instead of the one-shot
keyword/plan router. The model picks a tool, sees the real result, and decides
the next step — so counts/classes in its replies come from the detector, never a
guess.

`image_tool_specs` returns the OpenAI `tools` array for the enabled, image-modality
tools; the orchestrator supplies the executor that actually runs each one.
"""

from __future__ import annotations

from typing import Any

from . import routing

# Tool name → the toggleable capability id it belongs to (for the Tools menu).
# `None` means a read-only tool that is always available.
TOOL_CAPABILITY: dict[str, str | None] = {
    "detect_objects": "detect",
    "segment_detections": "segment",
    "qa_review": "qa_review",
    "suggest_labels": "suggest_labels",
    "get_annotations": None,
}


def _spec(name: str, description: str, properties: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": properties or {},
                "required": [],
            },
        },
    }


# Canonical specs, in display order. The union is the master list; the registry
# is filtered per turn by the user's enabled-tools set.
_IMAGE_TOOLS: list[dict[str, Any]] = [
    _spec(
        "detect_objects",
        "Run the on-device object detector on the current image. Optionally filter to a "
        "single object class (e.g. 'car'). Detected boxes are added to the canvas as "
        "predictions for the user to accept. Returns how many were found and the per-class "
        "counts — use this instead of guessing what is in the image.",
        {
            "target": {
                "type": "string",
                "description": "Optional single object class to detect, e.g. 'car'. "
                "Omit to detect every object.",
            },
            "confidence": {
                "type": "number",
                "description": "Optional detection confidence threshold between 0 and 1. "
                "Omit to use the default (which already retries at a low threshold when "
                "nothing is found). Pass a low value like 0.1 to surface more candidates.",
            },
        },
    ),
    _spec(
        "segment_detections",
        "Outline the current image's detections as polygon masks using SAM. Call "
        "detect_objects first; this traces those boxes. Returns how many were outlined.",
    ),
    _spec(
        "qa_review",
        "Quality-check the user's existing labels on this image by comparing them against "
        "the detector: finds likely missed objects (added as predictions), mislabels, and "
        "near-duplicate boxes. Returns the counts.",
    ),
    _spec(
        "suggest_labels",
        "Suggest label/class names worth adding to the project for this image, drawn from "
        "the detector and/or the vision model. Returns the suggested names (the user can add "
        "them with one tap).",
    ),
    _spec(
        "get_annotations",
        "Read the labels the user has already drawn on this image — the total and the "
        "per-class breakdown. Read-only; use it to ground answers about current progress.",
    ),
]


def image_tool_specs(enabled: list[str] | None) -> list[dict[str, Any]]:
    """The tool specs offered for an image turn, filtered to the user's enabled set
    (`None`/empty = all on). Read-only tools (capability `None`) are always offered."""
    out = []
    for spec in _IMAGE_TOOLS:
        name = spec["function"]["name"]
        capability = TOOL_CAPABILITY.get(name)
        if capability is None or routing.tool_enabled(capability, enabled):
            out.append(spec)
    return out
