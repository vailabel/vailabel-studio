"""LLM-driven plan orchestration (port of `domain/planning.rs`).

The local LLM is an *orchestrator*, not a geometry source: it turns a message
into a small, validated plan of capabilities that we then execute
deterministically (e.g. detect -> segment-each). It can only ever improve on the
keyword router -- when the LLM is absent or returns garbage, `route_to_plan` is
the fallback.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum

from .routing import Capability, RoutedIntent, route

#: Max steps honored from an LLM plan (guards against a runaway response).
MAX_PLAN_STEPS = 4


class PlanCapability(str, Enum):
    """One capability the orchestrator may schedule. Closed set -- anything
    outside it is dropped during parsing so a hallucinated step can't run."""

    PROMPT_TO_DETECT = "prompt_to_detect"
    DETECT_ALL = "detect_all"
    SEGMENT_EACH_DETECTION = "segment_each_detection"
    SEGMENT_AT_POINTS = "segment_at_points"
    QA_REVIEW = "qa_review"
    SUGGEST_LABELS = "suggest_labels"
    DESCRIBE = "describe"
    OCR = "ocr"
    SUMMARIZE = "summarize"
    HELP = "help"

    @staticmethod
    def parse(value: str) -> "PlanCapability | None":
        return _PLAN_ALIASES.get(value.strip().lower())

    def is_detect(self) -> bool:
        return self in (PlanCapability.PROMPT_TO_DETECT, PlanCapability.DETECT_ALL)

    def tool_id(self) -> str:
        """The toggleable tool id this step belongs to (for enable/disable gating)."""
        return _PLAN_TOOL_IDS[self]


_PLAN_ALIASES: dict[str, PlanCapability] = {
    "prompt_to_detect": PlanCapability.PROMPT_TO_DETECT,
    "prompt_detect": PlanCapability.PROMPT_TO_DETECT,
    "detect_all": PlanCapability.DETECT_ALL,
    "detect": PlanCapability.DETECT_ALL,
    "segment_each_detection": PlanCapability.SEGMENT_EACH_DETECTION,
    "segment_each": PlanCapability.SEGMENT_EACH_DETECTION,
    "segment_at_points": PlanCapability.SEGMENT_AT_POINTS,
    "segment": PlanCapability.SEGMENT_AT_POINTS,
    "qa_review": PlanCapability.QA_REVIEW,
    "qa": PlanCapability.QA_REVIEW,
    "suggest_labels": PlanCapability.SUGGEST_LABELS,
    "suggest_label": PlanCapability.SUGGEST_LABELS,
    "recommend_labels": PlanCapability.SUGGEST_LABELS,
    "describe": PlanCapability.DESCRIBE,
    "caption": PlanCapability.DESCRIBE,
    "ocr": PlanCapability.OCR,
    "summarize": PlanCapability.SUMMARIZE,
    "help": PlanCapability.HELP,
}

_PLAN_TOOL_IDS: dict[PlanCapability, str] = {
    PlanCapability.PROMPT_TO_DETECT: "detect",
    PlanCapability.DETECT_ALL: "detect",
    PlanCapability.SEGMENT_EACH_DETECTION: "segment",
    PlanCapability.SEGMENT_AT_POINTS: "segment",
    PlanCapability.QA_REVIEW: "qa_review",
    PlanCapability.SUGGEST_LABELS: "suggest_labels",
    PlanCapability.DESCRIBE: "describe",
    PlanCapability.OCR: "ocr",
    PlanCapability.SUMMARIZE: "summarize",
    PlanCapability.HELP: "help",
}

_PLAN_TO_CAPABILITY: dict[PlanCapability, Capability] = {
    PlanCapability.PROMPT_TO_DETECT: Capability.DETECT,
    PlanCapability.DETECT_ALL: Capability.DETECT,
    PlanCapability.QA_REVIEW: Capability.QA,
    PlanCapability.SEGMENT_AT_POINTS: Capability.SEGMENT,
    PlanCapability.SEGMENT_EACH_DETECTION: Capability.SEGMENT,
    PlanCapability.SUGGEST_LABELS: Capability.SUGGEST_LABELS,
    PlanCapability.DESCRIBE: Capability.DESCRIBE,
    PlanCapability.OCR: Capability.OCR,
    PlanCapability.SUMMARIZE: Capability.SUMMARIZE,
    PlanCapability.HELP: Capability.HELP,
}


@dataclass
class PlanStep:
    capability: PlanCapability
    #: Optional class target, e.g. "car" for prompt_to_detect.
    target: str | None = None

    def is_detect(self) -> bool:
        return self.capability.is_detect()

    def to_routed_intent(self) -> RoutedIntent:
        """Map back to a `RoutedIntent` so single-step plans reuse the existing
        per-capability dispatch unchanged."""
        return RoutedIntent(
            capability=_PLAN_TO_CAPABILITY[self.capability], target=self.target
        )


@dataclass
class Plan:
    steps: list[PlanStep] = field(default_factory=list)


PLANNER_SYSTEM_PROMPT = (
    "You convert a user's image-labeling request into a small JSON plan for an "
    "offline annotation tool. Respond with ONLY a JSON object — no prose, no "
    "markdown fences.\n"
    'Schema: {"steps":[{"capability": one of [prompt_to_detect, detect_all, '
    "segment_each_detection, segment_at_points, qa_review, suggest_labels, describe, "
    'ocr, help], "target": optional object class like "car"}]}\n'
    "Rules:\n"
    "- prompt_to_detect is ONLY for a specific named object class (car, dog, person). "
    'Its `target` must be that class word — never "object", "objects", "everything", '
    'or "all".\n'
    '- "find/label all X" where X is a specific class → prompt_to_detect with target X.\n'
    '- "detect objects"/"detect all"/"detect everything"/"label everything" (no '
    "specific class) → detect_all with NO target.\n"
    "- if the user also says outline/segment/mask them after detecting → add "
    "segment_each_detection.\n"
    '- "what did I miss"/"review"/"check" → qa_review.\n'
    '- "suggest labels"/"recommend labels"/"what should I label"/"what labels or '
    'classes" → suggest_labels (no target).\n'
    '- "describe" → describe; "read text" → ocr; anything else → help.\n'
    "- At most 3 steps. Only use capabilities from the list.\n"
    "Examples:\n"
    '"detect objects" → {"steps":[{"capability":"detect_all"}]}\n'
    '"find all cars" → {"steps":[{"capability":"prompt_to_detect","target":"car"}]}\n'
    '"find all cars and outline them" → {"steps":[{"capability":"prompt_to_detect",'
    '"target":"car"},{"capability":"segment_each_detection"}]}\n'
    '"detect everything" → {"steps":[{"capability":"detect_all"}]}\n'
    '"what did I miss" → {"steps":[{"capability":"qa_review"}]}\n'
    '"suggest labels for this image" → {"steps":[{"capability":"suggest_labels"}]}'
)


def planner_user_prompt(message: str, vocab: list[str]) -> str:
    """Build the planner's user turn: the message plus a hint of the detector's
    known classes so it picks valid targets."""
    classes = [name for name in vocab if name][:40]
    if not classes:
        return f"User: {message}"
    return f"Known object classes: {', '.join(classes)}.\nUser: {message}"


def parse_plan(raw: str) -> Plan | None:
    """Parse an LLM response into a validated `Plan`. Tolerates markdown fences and
    surrounding prose by extracting the first balanced JSON object; drops steps
    with unknown capabilities. Returns `None` when nothing usable is found, so the
    caller falls back to the deterministic `route_to_plan`."""
    json_str = _extract_json_object(raw)
    if json_str is None:
        return None
    try:
        value = json.loads(json_str)
    except (ValueError, TypeError):
        return None
    if not isinstance(value, dict):
        return None
    steps_value = value.get("steps")
    if not isinstance(steps_value, list):
        return None

    steps: list[PlanStep] = []
    for step in steps_value[:MAX_PLAN_STEPS]:
        if not isinstance(step, dict):
            continue
        cap_raw = step.get("capability")
        if not isinstance(cap_raw, str):
            continue
        capability = PlanCapability.parse(cap_raw)
        if capability is None:
            continue
        target_raw = step.get("target")
        target = None
        if isinstance(target_raw, str):
            stripped = target_raw.strip()
            target = stripped if stripped else None
        steps.append(PlanStep(capability=capability, target=target))

    return Plan(steps=steps) if steps else None


# ----------------------- Generic (non-image) planner -----------------------

GENERIC_PLANNER_SYSTEM_PROMPT = (
    "You route a user's request in an offline data-labeling tool to ONE tool, based "
    "on what they want. Respond with ONLY a JSON object — no prose, no markdown "
    "fences.\n"
    'Schema: {"tool": one of [suggest_labels, chat]}\n'
    "Tools:\n"
    "- suggest_labels: the user wants you to PROPOSE label or category names to add "
    'to their project (e.g. "what should I tag here", "give me classes for this", '
    '"what categories fit these rows").\n'
    "- chat: anything else — summarizing, answering questions, classifying, or "
    "explaining the content.\n"
    "Examples:\n"
    '"what labels should I use" → {"tool":"suggest_labels"}\n'
    '"summarize this" → {"tool":"chat"}\n'
    '"is this review positive or negative?" → {"tool":"chat"}\n'
    '"suggest some categories for these rows" → {"tool":"suggest_labels"}'
)


def generic_planner_user_prompt(message: str) -> str:
    return f"User: {message}"


def parse_generic_intent(raw: str) -> Capability | None:
    """Parse the generic planner's JSON answer into a `Capability` (only
    SUGGEST_LABELS or HELP/chat are reachable). Returns `None` when the answer
    isn't usable, so the caller falls back to the keyword router."""
    json_str = _extract_json_object(raw)
    if json_str is None:
        return None
    try:
        value = json.loads(json_str)
    except (ValueError, TypeError):
        return None
    if not isinstance(value, dict):
        return None
    tool = value.get("tool")
    if not isinstance(tool, str):
        return None
    tool = tool.strip().lower()
    if tool in ("suggest_labels", "suggest_label", "recommend_labels"):
        return Capability.SUGGEST_LABELS
    if tool in ("chat", "answer", "summarize", "help"):
        return Capability.HELP
    return None


def route_to_plan(message: str, vocab: list[str]) -> Plan:
    """The deterministic single-step plan from the keyword router -- the fallback
    when no LLM is available or its output is unusable."""
    intent = route(message, vocab)
    if intent.capability == Capability.DETECT:
        capability = (
            PlanCapability.PROMPT_TO_DETECT
            if intent.target is not None
            else PlanCapability.DETECT_ALL
        )
    elif intent.capability == Capability.QA:
        capability = PlanCapability.QA_REVIEW
    elif intent.capability == Capability.SEGMENT:
        capability = PlanCapability.SEGMENT_AT_POINTS
    elif intent.capability == Capability.SUGGEST_LABELS:
        capability = PlanCapability.SUGGEST_LABELS
    elif intent.capability == Capability.DESCRIBE:
        capability = PlanCapability.DESCRIBE
    elif intent.capability == Capability.OCR:
        capability = PlanCapability.OCR
    elif intent.capability == Capability.SUMMARIZE:
        capability = PlanCapability.SUMMARIZE
    else:
        capability = PlanCapability.HELP
    return Plan(steps=[PlanStep(capability=capability, target=intent.target)])


def _extract_json_object(raw: str) -> str | None:
    """Extract the first balanced `{...}` object from arbitrary model output,
    ignoring braces inside JSON strings."""
    start = raw.find("{")
    if start < 0:
        return None
    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(raw)):
        c = raw[i]
        if in_string:
            if escaped:
                escaped = False
            elif c == "\\":
                escaped = True
            elif c == '"':
                in_string = False
        else:
            if c == '"':
                in_string = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return raw[start : i + 1]
    return None
