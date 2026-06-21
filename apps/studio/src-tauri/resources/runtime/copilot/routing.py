"""Deterministic, rules-based intent routing (port of `domain/routing.rs`).

Small local models can't reliably run a function-calling loop, so a keyword
router maps each chat message to a single `Capability`. This is the fallback
whenever the LLM planner (see `planning`) is absent or returns something unusable.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Capability(str, Enum):
    """What a user message resolved to."""

    DETECT = "detect"
    QA = "qa_review"
    DESCRIBE = "describe"
    OCR = "ocr"
    SEGMENT = "segment"
    SUGGEST_LABELS = "suggest_labels"
    SUMMARIZE = "summarize"
    HELP = "help"

    def as_str(self) -> str:
        return self.value


#: Tools the user can switch on/off in the copilot's Tools menu, in display
#: order. `help` and `summarize` are intentionally excluded -- they explain or
#: navigate rather than run a model, so they are always available.
TOGGLEABLE_TOOLS: tuple[str, ...] = (
    "suggest_labels",
    "detect",
    "segment",
    "qa_review",
    "describe",
    "ocr",
)

_TOOL_LABELS = {
    "detect": "Detect objects",
    "segment": "Outline / segment",
    "qa_review": "Check what I missed",
    "suggest_labels": "Suggest labels",
    "describe": "Describe image",
    "ocr": "Read text (OCR)",
}


def tool_label(tool_id: str) -> str:
    """Human label for a tool id, for messages back to the user."""
    return _TOOL_LABELS.get(tool_id, "that tool")


def tool_enabled(tool_id: str, enabled: list[str] | None) -> bool:
    """Whether a tool may run given the user's enabled set. `None`/empty = all on
    (back-compat for older clients). `help`/`summarize` are always allowed."""
    if tool_id in ("help", "summarize"):
        return True
    if enabled is None or len(enabled) == 0:
        return True
    return any(entry == tool_id for entry in enabled)


def disabled_tools_reply(enabled: list[str] | None) -> str:
    """Reply when everything a message routed to is turned off -- name the tools
    that are still on so the user knows what they can ask for."""
    on = [tool_label(tool) for tool in TOGGLEABLE_TOOLS if tool_enabled(tool, enabled)]
    if not on:
        return (
            "All of my tools are turned off. Open the Tools menu at the top of this "
            "panel and switch on the ones you want me to use."
        )
    return (
        "That tool is turned off. Turn it back on in the Tools menu, or ask me to use "
        "one that’s on: " + ", ".join(on) + "."
    )


@dataclass
class RoutedIntent:
    capability: Capability
    #: Optional class target, e.g. "car" in "label all the cars".
    target: str | None = None


def _contains_any(haystack: str, needles: tuple[str, ...]) -> bool:
    return any(needle in haystack for needle in needles)


#: Phrases that signal a label/class-name suggestion request, shared by the image
#: and generic routers so the two stay in step.
_LABEL_SUGGEST_NEEDLES: tuple[str, ...] = (
    "suggest label",
    "suggest a label",
    "recommend label",
    "label suggestion",
    "suggest class",
    "recommend class",
    "what label",
    "which label",
    "label names",
    "what should i label",
    "what to label",
    "what classes",
    "which classes",
    "what categories",
    "which categories",
    "suggest categor",
    "suggest tag",
    "what tags",
)


def _extract_target(text: str, label_names: list[str]) -> str | None:
    """Pull a class/label target out of the message when a project label is named
    ("label all the cars" -> "car"). Shared by both routers."""
    for name in label_names:
        lower = name.lower()
        if lower and (lower in text or f"{lower}s" in text):
            return name
    return None


def route_generic(message: str, label_names: list[str]) -> RoutedIntent:
    """Route a message for a **non-image** modality (text/tabular/audio/video/custom).

    The detector/SAM/OCR capabilities don't apply there, so a message is either a
    label-name suggestion (`SUGGEST_LABELS`) or general chat handled by the local
    LLM (`HELP`).
    """
    text = message.lower()
    capability = (
        Capability.SUGGEST_LABELS
        if _contains_any(text, _LABEL_SUGGEST_NEEDLES)
        else Capability.HELP
    )
    return RoutedIntent(capability=capability, target=_extract_target(text, label_names))


def route(message: str, label_names: list[str]) -> RoutedIntent:
    """Map a chat message to a capability. Order matters: strong QA signals
    ("what did I miss") must win over the weaker "describe"/"detect" verbs."""
    text = message.lower()

    if _contains_any(text, ("ocr", "read text", "read the text", "text in")):
        capability = Capability.OCR
    elif _contains_any(text, ("segment", "outline", "mask", "make a polygon", "trace")):
        capability = Capability.SEGMENT
    elif _contains_any(
        text,
        (
            "suggest label",
            "suggest a label",
            "recommend label",
            "label suggestion",
            "suggest class",
            "recommend class",
            "what label",
            "which label",
            "label names",
            "what should i label",
            "what to label",
            "what classes",
            "which classes",
        ),
    ):
        capability = Capability.SUGGEST_LABELS
    elif _contains_any(
        text,
        (
            "miss",
            "missed",
            "missing",
            "mistake",
            "wrong",
            "review",
            "check ",
            "double check",
            "double-check",
            "verify",
            "qa",
            "quality",
            "did i",
            "errors",
            "incorrect",
        ),
    ):
        capability = Capability.QA
    elif _contains_any(
        text,
        (
            "describe",
            "caption",
            "what is in",
            "what's in",
            "whats in",
            "what do you see",
            "what can you see",
            "explain this image",
        ),
    ):
        capability = Capability.DESCRIBE
    elif _contains_any(
        text,
        (
            "detect",
            "label all",
            "label the",
            "label this",
            "label it",
            "label image",
            "label everything",
            "auto label",
            "auto-label",
            "autolabel",
            "find ",
            "annotate",
            "identify",
            "locate",
            "box ",
            "boxes",
        ),
    ):
        capability = Capability.DETECT
    elif _contains_any(
        text,
        ("summar", "dataset", "imbalance", "statistic", "distribution", "class balance"),
    ):
        capability = Capability.SUMMARIZE
    else:
        capability = Capability.HELP

    return RoutedIntent(capability=capability, target=_extract_target(text, label_names))
