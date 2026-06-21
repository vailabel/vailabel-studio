"""The copilot use-case service (port of `application/service.rs`).

`CopilotService.turn` transcribes the Rust orchestration -- route -> plan ->
dispatch/execute + the per-capability handlers -- depending only on:

- a **context** object (all the entity reads Rust gathered: item, labels,
  annotations, predictions, resolved model paths, detector vocab), and
- an **inference** port (detect / segment compute, run in-process by the runtime),
- an **llm** port (`llm.LocalLlm`, or a fake in tests).

It carries no HTTP/DB knowledge. The geometry it produces comes back as raw
prediction *drafts* in the result; Rust runs its existing `persist_drafts` over
them (label-matching, row writes, events).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from . import agent
from . import labels as labels_mod
from . import planning, qa, routing
from .config import LlmConfig
from .llm import LlmError
from .routing import Capability
from .tools import image_tool_specs

DEFAULT_AI_LABEL_COLOR = "#22c55e"

#: Cap on detections auto-segmented in a chained detect -> segment-each turn.
MAX_SEGMENT_FANOUT = 20

#: Default detection confidence (matches the UI's auto-label slider default).
DEFAULT_CONF = 0.25
#: Recall-first retry threshold when nothing is found at DEFAULT_CONF. The app's
#: own Conf slider hint is "lower it if auto-label finds nothing" -- the copilot
#: does that automatically so a quiet model still surfaces candidates to review.
LOW_CONF = 0.10

COPILOT_AGENT_SYSTEM_PROMPT = (
    "You are the AI labeling copilot inside VaiLabel Studio, an image-annotation tool that "
    "runs entirely on the user's machine. You help the user label the current image.\n"
    "You have tools: detect_objects (the on-device detector), segment_detections (SAM "
    "outlines of the detections), qa_review (check the user's existing labels), "
    "suggest_labels, and get_annotations. ALWAYS use a tool to get real results — never "
    "guess object counts and never claim boxes are on the canvas unless a tool actually "
    "added them. If the user asks what is in the image or to label/find something, call "
    "detect_objects. Chain tools when it helps (e.g. detect, then segment).\n"
    "After the tools run, answer in one or two short, concrete sentences grounded in their "
    "results — no preamble, no markdown headers. If a tool returns an error, tell the user "
    "plainly what to do next.\n"
    "Auto-labeling: when detect_objects finds nothing even at low confidence, the built-in "
    "detector only knows the 80 common COCO classes — say so, and tell the user to label a "
    "few examples by hand and train a model on the project's Model tab (it will then "
    "auto-label the rest), or to ask you to suggest labels. Never tell the user to just "
    "'try a different image'."
)

COPILOT_SYSTEM_PROMPT = (
    "You are the AI labeling copilot inside VaiLabel Studio, an image annotation tool "
    "that runs entirely on the user's machine. When an image is provided, look at it "
    "and answer concisely and concretely to help the user label it — objects present, "
    "their attributes, and any readable text. You cannot draw boxes yourself: if the "
    "user wants annotations created, tell them to ask you to “detect objects” or “check "
    "what I missed”, which run the local detector. Keep answers short and practical."
)

NARRATION_SYSTEM_PROMPT = (
    "You rewrite one short status line from an image labeling tool into plain language "
    "for the user. Output ONLY the rewritten status as one or two sentences — no "
    "greeting, no preamble, no “Okay”/“Sure”/“Let's begin”, no markdown, no follow-up "
    "question. State only what the status says; never invent objects, counts, or that "
    "boxes exist when the status says none were found."
)

LABEL_SUGGEST_SYSTEM_PROMPT = (
    "You help a user set up an image-annotation project. Look at the image and list the "
    "distinct object categories worth labeling with bounding boxes. Reply with ONLY a "
    "comma-separated list of short, lowercase, singular class names (for example: car, "
    "person, traffic light, dog). No numbers, no counts, no descriptions, no markdown — "
    "just the list. Give between 3 and 12 of the most useful, concrete categories."
)
LABEL_SUGGEST_USER_PROMPT = "What object categories should I label in this image?"
GENERIC_LABEL_SUGGEST_USER_PROMPT = "What label categories should I use for this item?"


# --------------------------------- ports ------------------------------------


class CopilotInferencePort(Protocol):
    """The detect/segment compute the orchestrator runs in-process. The runtime
    adapter wraps `inference/detect.py` + `inference/segment.py`; tests use a fake.
    Both return raw `InferenceAnnotationDraft`-shaped dicts."""

    def detect(
        self,
        image_path: str,
        model_path: str,
        target: str | None,
        conf: float = DEFAULT_CONF,
    ) -> list[dict[str, Any]]:
        ...

    def segment_boxes(
        self,
        image_path: str,
        sam_model_path: str | None,
        boxes: list[list[float]],
        target: str | None,
    ) -> list[dict[str, Any]]:
        ...


class CopilotLlmPort(Protocol):
    def resolve(self) -> LlmConfig | None: ...
    def invalidate(self) -> None: ...
    def server_reachable(self, base_url: str) -> bool: ...
    def chat(
        self, config: LlmConfig, system: str, user_text: str, image_data_url: str | None = None
    ) -> str: ...
    def chat_json(self, config: LlmConfig, system: str, user_text: str) -> str: ...
    def chat_messages(
        self, config: LlmConfig, messages: list[dict[str, Any]], tools: list | None = None
    ) -> dict[str, Any]: ...
    def image_data_url(self, path: str) -> str | None: ...
    def read_text_file(self, path: str) -> str | None: ...
    def test_connection(self, base_url: str, api_key: str | None) -> list[str]: ...


@dataclass
class CopilotContext:
    """Everything Rust read from the store for this turn. Replaces the Rust
    `CopilotInference` *read* methods -- the orchestrator only computes off this."""

    item: dict[str, Any] | None = None
    project_labels: list[dict[str, Any]] = field(default_factory=list)
    annotations: list[dict[str, Any]] = field(default_factory=list)
    predictions: list[dict[str, Any]] = field(default_factory=list)
    detector_model_path: str | None = None
    detector_class_names: list[str] = field(default_factory=list)
    segmentation_model_path: str | None = None
    #: The built-in (catalog) detector, used as a fallback when the user's
    #: fine-tuned/active model finds nothing. `None` when the active model already
    #: IS the built-in (nothing to fall back to).
    fallback_detector_model_path: str | None = None


@dataclass
class TurnPayload:
    item_id: str
    message: str
    project_id: str | None = None
    modality: str | None = None
    task: str | None = None
    enabled_tools: list[str] | None = None
    #: Prior chat turns ([{role, content}], user/assistant) for conversation memory.
    history: list[dict[str, Any]] | None = None


class CopilotError(Exception):
    """A turn failure Rust maps to a transport error (e.g. item not found)."""


# --------------------------------- service ----------------------------------


class CopilotService:
    def __init__(self, llm: CopilotLlmPort, inference: CopilotInferencePort) -> None:
        self._llm = llm
        self._inference = inference

    # --- public API ---------------------------------------------------------

    def test_connection(self, base_url: str, api_key: str | None) -> dict[str, Any]:
        try:
            models = self._llm.test_connection(base_url, api_key)
        except LlmError as exc:
            return {"ok": False, "message": str(exc), "models": []}
        self._llm.invalidate()
        count = len(models)
        return {
            "ok": True,
            "message": f"Connected — {count} model{'' if count == 1 else 's'} available.",
            "models": models,
        }

    def turn(self, payload: TurnPayload, context: CopilotContext) -> dict[str, Any]:
        """One copilot chat turn: route the message to a capability and dispatch."""
        if payload.modality not in (None, "", "image"):
            return self._turn_generic(payload, context)

        image = context.item
        if image is None:
            raise CopilotError("Image not found")

        project_id = (
            (payload.project_id or "").strip()
            or _value_string(image, "projectId", "project_id")
            or ""
        )
        labels = context.project_labels if project_id else []
        label_names = [
            name for label in labels if (name := _value_string(label, "name", "name"))
        ]

        vocab = list(label_names) + list(context.detector_class_names)
        llm = self._llm.resolve()

        # Agentic path: when a local model is available, let it drive the tools in a
        # multi-step, grounded loop (with conversation memory). On a transport
        # failure, degrade to the deterministic keyword/plan path below.
        if llm is not None:
            try:
                agent_result, ran_tool = self._agent_turn(payload, context, image, llm)
            except LlmError:
                if not self._llm.server_reachable(llm.base_url):
                    self._llm.invalidate()
                llm = None
            else:
                # Trust the agent when it actually ran a tool, or when the message
                # wasn't a clear labeling action. But if a weak model just *chatted*
                # at a "detect / label / QA / suggest" request, don't show empty
                # text — fall through and run the engine deterministically so the
                # user gets predictions to approve.
                if ran_tool or not _is_action_request(payload.message, vocab):
                    return agent_result

        plan = self._plan_message(payload.message, vocab, llm) or planning.route_to_plan(
            payload.message, vocab
        )

        enabled = payload.enabled_tools
        plan.steps = [
            step
            for step in plan.steps
            if routing.tool_enabled(step.capability.tool_id(), enabled)
        ]

        if not plan.steps:
            intent = routing.route(payload.message, vocab)
            if routing.tool_enabled(intent.capability.as_str(), enabled):
                return self._dispatch_intent(intent, image, payload.message, context, llm)
            return _reply_only(Capability.HELP, routing.disabled_tools_reply(enabled))

        if len(plan.steps) == 1:
            intent = plan.steps[0].to_routed_intent()
            return self._dispatch_intent(intent, image, payload.message, context, llm)

        return self._execute_plan(plan, image, payload.message, context, llm)

    # --- planning -----------------------------------------------------------

    def _plan_message(
        self, message: str, vocab: list[str], llm: LlmConfig | None
    ) -> planning.Plan | None:
        if llm is None:
            return None
        user = planning.planner_user_prompt(message, vocab)
        try:
            raw = self._llm.chat_json(llm, planning.PLANNER_SYSTEM_PROMPT, user)
        except LlmError:
            if not self._llm.server_reachable(llm.base_url):
                self._llm.invalidate()
            return None
        return planning.parse_plan(raw)

    # --- agentic tool-use loop ---------------------------------------------

    def _agent_turn(
        self,
        payload: "TurnPayload",
        context: "CopilotContext",
        image: dict[str, Any],
        config: LlmConfig,
    ) -> tuple[dict[str, Any], bool]:
        """One image turn driven by the LLM tool-calling loop. The model calls the
        copilot's tools; each runs the real engine and accumulates predictions /
        findings / actions, and the model's final reply is grounded in their
        results. Conversation history is replayed for memory. Returns `(result,
        ran_tool)` — `ran_tool` is False when the model only chatted, so the caller
        can fall back to running the engine deterministically."""
        image_path = _value_string(image, "path", "path") or ""
        predictions: list[dict[str, Any]] = []
        findings: list[dict[str, Any]] = []
        actions: list[dict[str, Any]] = []
        last_detections: list[dict[str, Any]] = []
        # Whether the model invoked a *producing* tool (detector/SAM/QA/suggest) —
        # the caller uses this to detect a model that chatted instead of acting.
        ran_tool = [False]

        def execute(name: str, args: dict[str, Any]) -> dict[str, Any]:
            nonlocal last_detections
            if name in ("detect_objects", "segment_detections", "qa_review", "suggest_labels"):
                ran_tool[0] = True
            if name == "detect_objects":
                if not context.detector_model_path:
                    return {"error": "No detector model is installed."}
                target = str(args.get("target") or "").strip() or None
                if target and _is_generic_detect_target(target):
                    target = None
                conf_arg = args.get("confidence")
                explicit_conf = (
                    float(conf_arg)
                    if isinstance(conf_arg, (int, float)) and 0 < float(conf_arg) <= 1
                    else None
                )
                used_builtin = False
                try:
                    if explicit_conf is not None:
                        drafts = self._inference.detect(
                            image_path, context.detector_model_path, target, explicit_conf
                        )
                        low = False
                    else:
                        drafts, low, used_builtin = self._detect_grounded(
                            image_path, target, context
                        )
                except CopilotError as exc:
                    return {"error": str(exc)}
                last_detections = [
                    d for d in drafts if _value_string(d, "type", "type") != "polygon"
                ]
                predictions.extend(drafts)
                result: dict[str, Any] = {
                    "detected": len(drafts),
                    "classes": _class_counts(drafts),
                }
                if used_builtin:
                    result["note_model"] = (
                        "the user's trained model found nothing, so the built-in detector "
                        "was used — mention this and suggest retraining with more examples"
                    )
                if low:
                    result["note"] = (
                        "found only at a lowered confidence threshold — tell the user to "
                        "review these carefully"
                    )
                if not drafts:
                    result["hint"] = (
                        "Nothing found even at low confidence. This detector only knows the "
                        "80 COCO classes, so it can't see custom objects. Tell the user to "
                        "label a few examples by hand and train a model on the project's "
                        "Model tab (then it auto-labels the rest), or call suggest_labels."
                    )
                return result
            if name == "segment_detections":
                boxes = _detection_boxes(last_detections)
                if not boxes:
                    return {"error": "No detections to outline yet — call detect_objects first."}
                try:
                    polygons = self._inference.segment_boxes(
                        image_path, context.segmentation_model_path, boxes, None
                    )
                except CopilotError as exc:
                    return {"error": str(exc)}
                predictions.extend(polygons)
                return {"outlined": len(polygons)}
            if name == "qa_review":
                if not context.detector_model_path:
                    return {"error": "No detector model is installed."}
                try:
                    detections, _low, _fb = self._detect_grounded(image_path, None, context)
                except CopilotError as exc:
                    return {"error": str(exc)}
                qa_findings, qa_actions = qa.qa_findings(detections, context.annotations)
                predictions.extend(detections)
                findings.extend(qa_findings)
                actions.extend(qa_actions)
                return {
                    "missed": sum(1 for f in qa_findings if f["kind"] == "missed"),
                    "mislabels": sum(1 for a in qa_actions if a["kind"] == "relabel"),
                    "duplicates": sum(1 for a in qa_actions if a["kind"] == "delete"),
                }
            if name == "suggest_labels":
                result = self._copilot_suggest_labels(
                    routing.RoutedIntent(Capability.SUGGEST_LABELS), image, context, config
                )
                predictions.extend(result.get("predictions", []))
                actions.extend(result.get("proposedActions", []))
                return {
                    "suggestions": [
                        a["name"]
                        for a in result.get("proposedActions", [])
                        if a["kind"] == "createLabel"
                    ]
                }
            if name == "get_annotations":
                return {
                    "annotations": len(context.annotations),
                    "classes": _class_counts(context.annotations),
                }
            return {"error": f"unknown tool: {name}"}

        tools = image_tool_specs(payload.enabled_tools)
        image_url = None
        if config.vision and image_path:
            image_url = self._llm.image_data_url(image_path)
        reply = agent.run_agent(
            self._llm,
            config,
            COPILOT_AGENT_SYSTEM_PROMPT,
            payload.history or [],
            payload.message,
            image_url,
            tools,
            execute,
        )
        # A weak model can echo raw tool output ("[TOOL_RESULT] 12 …") instead of
        # writing a sentence. We ran the tools, so fall back to a grounded summary
        # built from the real results rather than show the user template noise.
        if not _usable_reply(reply):
            reply = _agent_fallback_reply(predictions, findings, actions)
        result = {
            "reply": reply or "Done.",
            "capability": "agent",
            "predictions": predictions,
            "findings": findings,
            "proposedActions": actions,
        }
        return result, ran_tool[0]

    # --- dispatch -----------------------------------------------------------

    def _dispatch_intent(
        self,
        intent: routing.RoutedIntent,
        image: dict[str, Any],
        message: str,
        context: CopilotContext,
        llm: LlmConfig | None,
    ) -> dict[str, Any]:
        cap = intent.capability
        if cap == Capability.DETECT:
            return self._copilot_detect(intent, image, context, llm)
        if cap == Capability.QA:
            return self._copilot_qa(intent, image, context, llm)
        if cap == Capability.SUGGEST_LABELS:
            return self._copilot_suggest_labels(intent, image, context, llm)
        if cap == Capability.SEGMENT:
            return _reply_only(
                cap,
                "Click an object (or draw a box) on the canvas and I’ll outline it with "
                "SAM. To outline detections in one go, ask me to “find all cars and "
                "outline them”.",
            )
        if cap == Capability.SUMMARIZE:
            return _reply_only(
                cap,
                "Open the Dataset Intelligence page to run a full dataset analysis — "
                "class balance, image counts, and quality checks.",
            )
        # Describe / Ocr / Help: conversational + vision.
        if llm is not None and (llm.vision or cap == Capability.HELP):
            return self._copilot_chat(intent, image, message, llm)
        if llm is not None:
            return _reply_only(
                cap,
                "I found a local model, but I don’t think it can see images. If it "
                "actually is a vision model, set Vision to “Always send the image” in "
                "Settings → AI Copilot and ask again. Otherwise load a vision model "
                "(look for a “-VL”, LLaVA, or Moondream model in LM Studio or Ollama). "
                "For now I can still run the detector — try “detect objects” or “check "
                "what I missed”.",
            )
        if cap == Capability.HELP:
            return _reply_only(
                cap,
                "I can label this image with your local detector — try “detect "
                "objects”, “find all cars”, or “check what I missed”. To describe "
                "images, read text, or chat, start a local model server (LM Studio, "
                "Ollama, or llama.cpp) and I’ll pick it up automatically.",
            )
        return _reply_only(
            cap,
            "Describing images and reading text needs a local vision model. Start a "
            "local model server (LM Studio, Ollama, or llama.cpp) and I’ll use it "
            "automatically — or run your detector now with “detect objects” or “check "
            "what I missed”.",
        )

    def _execute_plan(
        self,
        plan: planning.Plan,
        image: dict[str, Any],
        message: str,
        context: CopilotContext,
        llm: LlmConfig | None,
    ) -> dict[str, Any]:
        predictions: list[dict[str, Any]] = []
        findings: list[dict[str, Any]] = []
        proposed_actions: list[dict[str, Any]] = []
        reply_parts: list[str] = []
        last_detect_drafts: list[dict[str, Any]] = []
        last_detection_target: str | None = None
        image_path = _value_string(image, "path", "path")

        for step in plan.steps:
            if step.capability == planning.PlanCapability.SEGMENT_EACH_DETECTION:
                boxes = _detection_boxes(last_detect_drafts)
                if not boxes:
                    reply_parts.append("There were no detections to outline.")
                    continue
                try:
                    polygons = self._inference.segment_boxes(
                        image_path or "",
                        context.segmentation_model_path,
                        boxes,
                        last_detection_target,
                    )
                    predictions.extend(polygons)
                    reply_parts.append(
                        f"Outlined {len(polygons)} detection(s) as polygons."
                    )
                except CopilotError as exc:
                    reply_parts.append(f"I couldn't outline the detections: {exc}")
                continue

            intent = step.to_routed_intent()
            if step.is_detect():
                last_detection_target = intent.target
            result = self._dispatch_intent(intent, image, message, context, llm)
            if step.is_detect():
                last_detect_drafts = result.get("predictions", [])
            predictions.extend(result.get("predictions", []))
            findings.extend(result.get("findings", []))
            proposed_actions.extend(result.get("proposedActions", []))
            reply = result.get("reply", "")
            if reply.strip():
                reply_parts.append(reply)

        return {
            "reply": " ".join(reply_parts) if reply_parts else "Done.",
            "capability": "plan",
            "predictions": predictions,
            "findings": findings,
            "proposedActions": proposed_actions,
        }

    # --- per-capability handlers -------------------------------------------

    def _copilot_chat(
        self,
        intent: routing.RoutedIntent,
        image: dict[str, Any],
        message: str,
        config: LlmConfig,
    ) -> dict[str, Any]:
        image_url = None
        if config.vision:
            path = _value_string(image, "path", "path")
            if path:
                image_url = self._llm.image_data_url(path)
        try:
            reply = self._llm.chat(config, COPILOT_SYSTEM_PROMPT, message, image_url)
        except LlmError as exc:
            if not self._llm.server_reachable(config.base_url):
                self._llm.invalidate()
            reply = str(exc)
        return _reply_only(intent.capability, reply)

    def _copilot_detect(
        self,
        intent: routing.RoutedIntent,
        image: dict[str, Any],
        context: CopilotContext,
        llm: LlmConfig | None,
    ) -> dict[str, Any]:
        model_path = context.detector_model_path
        if not model_path:
            return _reply_only(
                intent.capability,
                "I don't have a detection model to use yet. Open the AI Models page and "
                "import or install one (e.g. a YOLO model), then ask me to detect again.",
            )

        target = intent.target.strip() if intent.target else None
        if target and _is_generic_detect_target(target):
            target = None

        image_path = _value_string(image, "path", "path") or ""
        try:
            predictions, low_conf, used_builtin = self._detect_grounded(
                image_path, target, context
            )
        except CopilotError as exc:
            return _reply_only(intent.capability, f"I couldn't run the detector: {exc}")

        count = len(predictions)
        if count == 0:
            vlm_available = llm is not None and llm.vision
            return _result(intent.capability, _no_detections_reply(target, vlm_available))

        summary = _summarize_by_class(predictions)
        builtin_note = (
            "Your trained model didn't find anything, so I used the built-in detector. "
            if used_builtin
            else ""
        )
        review_note = (
            " I lowered the confidence threshold to surface these, so review them "
            "carefully and reject any that look wrong."
            if low_conf
            else ""
        )
        fallback = (
            f"{builtin_note}Detected {count} object(s) ({summary}). They're on the canvas "
            f"as predictions — accept the ones you want to keep.{review_note}"
        )
        instruction = (
            (
                "The user's trained model found nothing, so the built-in detector was used. "
                if used_builtin
                else ""
            )
            + f"The detector found {count} objects on the image: {summary}. They are now on "
            "the canvas as predictions to accept or reject. "
            + (
                "These were found only at a lowered confidence threshold, so add that "
                "they should be reviewed carefully. "
                if low_conf
                else ""
            )
            + "Rewrite that as one short sentence. Do not invent objects beyond this list."
        )
        reply = self._narrate(llm, instruction, fallback)
        return _result(intent.capability, reply, predictions=predictions)

    def _detect_with_retry(
        self, image_path: str, model_path: str, target: str | None
    ) -> tuple[list[dict[str, Any]], bool]:
        """Detect at the normal threshold; if nothing is found, retry once at a low
        threshold for recall — the auto-label "lower it if it finds nothing" move,
        done automatically. Returns (drafts, used_low_conf)."""
        drafts = self._inference.detect(image_path, model_path, target, DEFAULT_CONF)
        if drafts:
            return drafts, False
        low = self._inference.detect(image_path, model_path, target, LOW_CONF)
        return low, bool(low)

    def _detect_grounded(
        self, image_path: str, target: str | None, context: "CopilotContext"
    ) -> tuple[list[dict[str, Any]], bool, bool]:
        """The full grounded detection: try the active model (with the low-confidence
        retry); if it still finds nothing, fall back to the built-in detector. A
        fine-tuned model that's undertrained shouldn't leave the user with nothing.
        Returns (drafts, used_low_conf, used_builtin_fallback)."""
        drafts, low = self._detect_with_retry(
            image_path, context.detector_model_path or "", target
        )
        if drafts:
            return drafts, low, False
        fallback = context.fallback_detector_model_path
        if fallback and fallback != context.detector_model_path:
            drafts, low = self._detect_with_retry(image_path, fallback, target)
            if drafts:
                return drafts, low, True
        return [], False, False

    def _copilot_qa(
        self,
        intent: routing.RoutedIntent,
        image: dict[str, Any],
        context: CopilotContext,
        llm: LlmConfig | None,
    ) -> dict[str, Any]:
        model_path = context.detector_model_path
        if not model_path:
            return _reply_only(
                intent.capability,
                "QA review compares your annotations against the detector, but I don't "
                "have a model yet. Import or install one on the AI Models page first.",
            )

        image_path = _value_string(image, "path", "path") or ""
        try:
            detections, _low, _fb = self._detect_grounded(image_path, None, context)
        except CopilotError as exc:
            return _reply_only(
                intent.capability, f"I couldn't run the detector for QA: {exc}"
            )

        findings, proposed_actions = qa.qa_findings(detections, context.annotations)
        missed = sum(1 for f in findings if f["kind"] == "missed")
        mislabels = sum(1 for a in proposed_actions if a["kind"] == "relabel")
        duplicates = sum(1 for a in proposed_actions if a["kind"] == "delete")

        if not findings:
            fallback = (
                "Looks good — the detector didn't surface any missed objects, "
                "mislabels, or duplicate boxes on this image."
            )
        else:
            fallback = (
                f"QA review: {missed} possible missed object(s) (added as predictions to "
                f"review), {mislabels} possible mislabel(s), and {duplicates} "
                "near-duplicate box(es). Approve the fixes you agree with below."
            )
        instruction = (
            "A QA pass compared the local detector against the user's existing labels on "
            f"this image. Findings: {missed} possible missed objects (added as "
            f"predictions), {mislabels} possible mislabels, {duplicates} near-duplicate "
            "boxes. In one or two short sentences, summarize this for the user and, if "
            "there are any fixes, tell them to approve the suggested fixes shown below. "
            "If everything is zero, reassure them it looks good."
        )
        reply = self._narrate(llm, instruction, fallback)
        return {
            "reply": reply,
            "capability": intent.capability.as_str(),
            "predictions": detections,
            "findings": findings,
            "proposedActions": proposed_actions,
        }

    def _copilot_suggest_labels(
        self,
        intent: routing.RoutedIntent,
        image: dict[str, Any],
        context: CopilotContext,
        llm: LlmConfig | None,
    ) -> dict[str, Any]:
        project_id = _value_string(image, "projectId", "project_id") or ""
        existing = context.project_labels if project_id else []
        existing_lower = {
            (name or "").strip().lower()
            for label in existing
            if (name := _value_string(label, "name", "name"))
        }

        suggestions: list[str] = []
        sources: list[str] = []
        notes: list[str] = []
        predictions: list[dict[str, Any]] = []

        vision_available = llm is not None and llm.vision
        if vision_available:
            try:
                names = self._vlm_suggest_labels(image, llm)  # type: ignore[arg-type]
                if names:
                    sources.append("the vision model")
                    suggestions.extend(names)
            except LlmError:
                if llm is not None and not self._llm.server_reachable(llm.base_url):
                    self._llm.invalidate()

        detector_available = bool(context.detector_model_path)
        if detector_available:
            image_path = _value_string(image, "path", "path") or ""
            try:
                preds, _low, _fb = self._detect_grounded(image_path, None, context)
                predictions = preds
                names = [
                    n
                    for p in preds
                    if (
                        n := (
                            _value_string(p, "labelName", "label_name")
                            or _value_string(p, "name", "name")
                            or ""
                        )
                        .strip()
                        .lower()
                    )
                ]
                if names:
                    sources.append("the detector")
                suggestions.extend(names)
            except CopilotError as exc:
                notes.append(f"The detector couldn’t run ({exc}).")

        if not vision_available and not detector_available:
            return _reply_only(
                intent.capability,
                "To suggest label names from this image I need either a local vision "
                "model (start LM Studio, Ollama, or llama.cpp with a “-VL”/LLaVA/"
                "Moondream model) or an installed detector (add a YOLO model on the AI "
                "Models page). Set up either one and ask again — both stay on your "
                "machine.",
            )

        fresh, already_have = _dedupe_fresh(suggestions, existing_lower)
        proposed_actions = [
            qa.create_label_action(
                name, DEFAULT_AI_LABEL_COLOR, project_id, f"Add “{name}” as a label"
            )
            for name in fresh
        ]
        reply = _build_suggest_reply(fresh, sources, already_have, notes)
        return {
            "reply": reply,
            "capability": intent.capability.as_str(),
            "predictions": predictions,
            "findings": [],
            "proposedActions": proposed_actions,
        }

    def _vlm_suggest_labels(self, image: dict[str, Any], config: LlmConfig) -> list[str]:
        path = _value_string(image, "path", "path")
        image_url = self._llm.image_data_url(path) if path else None
        if image_url is None:
            raise LlmError("Image file is unavailable for the vision model")
        raw = self._llm.chat(
            config, LABEL_SUGGEST_SYSTEM_PROMPT, LABEL_SUGGEST_USER_PROMPT, image_url
        )
        return labels_mod.parse_label_list(raw)

    # --- generic (non-image) path ------------------------------------------

    def _turn_generic(
        self, payload: TurnPayload, context: CopilotContext
    ) -> dict[str, Any]:
        item = context.item
        project_id = (
            (payload.project_id or "").strip()
            or (item and _value_string(item, "projectId", "project_id"))
            or ""
        )
        labels = context.project_labels if project_id else []
        label_names = [
            name for label in labels if (name := _value_string(label, "name", "name"))
        ]
        modality = payload.modality or ""
        content = self._item_content(item, modality) if item else None

        llm = self._llm.resolve()
        capability = self._plan_generic(payload.message, llm) or routing.route_generic(
            payload.message, label_names
        ).capability

        enabled = payload.enabled_tools
        if not routing.tool_enabled(capability.as_str(), enabled):
            return _reply_only(capability, routing.disabled_tools_reply(enabled))

        if capability == Capability.SUGGEST_LABELS:
            return self._copilot_suggest_labels_generic(
                project_id, labels, content, modality, payload.task, llm
            )
        return self._copilot_chat_generic(
            content, modality, payload.task, payload.message, llm
        )

    def _plan_generic(self, message: str, llm: LlmConfig | None) -> Capability | None:
        if llm is None:
            return None
        user = planning.generic_planner_user_prompt(message)
        try:
            raw = self._llm.chat_json(llm, planning.GENERIC_PLANNER_SYSTEM_PROMPT, user)
        except LlmError:
            if not self._llm.server_reachable(llm.base_url):
                self._llm.invalidate()
            return None
        return planning.parse_generic_intent(raw)

    def _item_content(self, item: dict[str, Any], modality: str) -> str | None:
        if modality == "tabular":
            return _format_row(item.get("data"))
        if modality in ("text", "custom"):
            path = _value_string(item, "path", "path")
            return self._llm.read_text_file(path) if path else None
        return None

    def _copilot_suggest_labels_generic(
        self,
        project_id: str,
        existing_labels: list[dict[str, Any]],
        content: str | None,
        modality: str,
        task: str | None,
        llm: LlmConfig | None,
    ) -> dict[str, Any]:
        if llm is None:
            return _reply_only(Capability.SUGGEST_LABELS, _generic_no_llm_reply(modality))

        existing_lower = {
            (name or "").strip().lower()
            for label in existing_labels
            if (name := _value_string(label, "name", "name"))
        }
        system = _generic_label_suggest_system_prompt(modality, task)
        user = (
            f"{GENERIC_LABEL_SUGGEST_USER_PROMPT}\n\nContent:\n{content}"
            if content
            else GENERIC_LABEL_SUGGEST_USER_PROMPT
        )
        try:
            raw = self._llm.chat(llm, system, user, None)
        except LlmError as exc:
            if not self._llm.server_reachable(llm.base_url):
                self._llm.invalidate()
            return _reply_only(Capability.SUGGEST_LABELS, str(exc))

        fresh, already_have = _dedupe_fresh(
            labels_mod.parse_label_list(raw), existing_lower
        )
        proposed_actions = [
            qa.create_label_action(
                name, DEFAULT_AI_LABEL_COLOR, project_id, f"Add “{name}” as a label"
            )
            for name in fresh
        ]
        return {
            "reply": _build_generic_suggest_reply(fresh, already_have),
            "capability": Capability.SUGGEST_LABELS.as_str(),
            "predictions": [],
            "findings": [],
            "proposedActions": proposed_actions,
        }

    def _copilot_chat_generic(
        self,
        content: str | None,
        modality: str,
        task: str | None,
        message: str,
        llm: LlmConfig | None,
    ) -> dict[str, Any]:
        if llm is None:
            return _reply_only(Capability.HELP, _generic_no_llm_reply(modality))
        system = _generic_chat_system_prompt(modality, task)
        user = (
            f"{message}\n\nThe {_modality_noun(modality)} I'm labeling contains:\n{content}"
            if content
            else message
        )
        try:
            reply = self._llm.chat(llm, system, user, None)
        except LlmError as exc:
            if not self._llm.server_reachable(llm.base_url):
                self._llm.invalidate()
            reply = str(exc)
        return _reply_only(Capability.HELP, reply)

    # --- narration ----------------------------------------------------------

    def _narrate(self, llm: LlmConfig | None, instruction: str, fallback: str) -> str:
        if llm is None:
            return fallback
        try:
            text = self._llm.chat(llm, NARRATION_SYSTEM_PROMPT, instruction, None)
        except LlmError:
            if not self._llm.server_reachable(llm.base_url):
                self._llm.invalidate()
            return fallback
        # A weak model can leak tool-template markers even here; scrub them, and use
        # the deterministic fallback if nothing usable remains.
        cleaned = agent._clean_reply(text)
        return cleaned if _usable_reply(cleaned) else fallback


# ------------------------------ free helpers --------------------------------


def _value_string(value: dict[str, Any], camel: str, snake: str) -> str | None:
    got = value.get(camel)
    if not isinstance(got, str):
        got = value.get(snake)
    return got if isinstance(got, str) else None


def _result(
    capability: Capability,
    reply: str,
    predictions: list[dict[str, Any]] | None = None,
    findings: list[dict[str, Any]] | None = None,
    proposed_actions: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "reply": reply,
        "capability": capability.as_str(),
        "predictions": predictions or [],
        "findings": findings or [],
        "proposedActions": proposed_actions or [],
    }


def _reply_only(capability: Capability, reply: str) -> dict[str, Any]:
    return _result(capability, reply)


def _is_generic_detect_target(target: str) -> bool:
    """Whether a detection target word is a generic placeholder ("object", "all", …)
    that must NOT filter the detector to a single class."""
    generic = {
        "object", "objects", "thing", "things", "item", "items", "stuff",
        "everything", "anything", "something", "all", "any", "every", "the", "a", "an",
    }
    trimmed = target.strip().lower()
    if not trimmed:
        return True
    return all(word in generic for word in trimmed.split())


def _no_detections_reply(target: str | None, vlm_available: bool) -> str:
    """Actionable reply when the detector finds nothing even at a low threshold —
    explains the COCO limitation and routes the user into the train→auto-label
    flywheel instead of the old 'try a different image' dead end."""
    what = f"“{target}”" if target else "any objects"
    parts = [
        f"I couldn't find {what} on this image, even after lowering the confidence "
        "threshold. The built-in detector only knows the 80 common COCO classes (people, "
        "vehicles, animals, everyday objects), so it won't pick up custom or specialized "
        "objects.",
        "To auto-label those: draw a few examples by hand, then train a model on the "
        "project's Model tab — once it's served I'll auto-label the rest from it.",
    ]
    if vlm_available:
        parts.append(
            "Or ask me to “suggest labels” and I'll propose what's worth tagging here."
        )
    return " ".join(parts)


def _is_action_request(message: str, vocab: list[str]) -> bool:
    """Whether a message is a clear labeling action the deterministic engine can
    fulfil (detect / QA / suggest labels). When a weak model chats instead of
    calling a tool on such a request, the caller runs the engine itself."""
    return routing.route(message, vocab).capability in (
        Capability.DETECT,
        Capability.QA,
        Capability.SUGGEST_LABELS,
    )


def _usable_reply(text: str) -> bool:
    """Whether an agent reply is a real sentence (not empty, and not a number/marker
    echo left after stripping tool-template artifacts)."""
    stripped = (text or "").strip()
    if len(stripped) < 2:
        return False
    return sum(1 for ch in stripped if ch.isalpha()) >= 2


def _agent_fallback_reply(
    predictions: list[dict[str, Any]],
    findings: list[dict[str, Any]],
    actions: list[dict[str, Any]],
) -> str:
    """A grounded reply synthesized from what the tools actually produced — used
    when the model's own text is unusable. Mirrors the deterministic phrasings."""
    parts: list[str] = []
    boxes = [p for p in predictions if _value_string(p, "type", "type") != "polygon"]
    polygons = [p for p in predictions if _value_string(p, "type", "type") == "polygon"]
    if boxes:
        parts.append(
            f"Detected {len(boxes)} object(s) ({_summarize_by_class(boxes)}). They're on "
            "the canvas as predictions — accept the ones you want to keep."
        )
    if polygons:
        parts.append(f"Outlined {len(polygons)} object(s) as polygons.")
    label_names = [a["name"] for a in actions if a.get("kind") == "createLabel"]
    if label_names:
        parts.append("Suggested labels: " + ", ".join(label_names) + ".")
    relabels = sum(1 for a in actions if a.get("kind") == "relabel")
    deletes = sum(1 for a in actions if a.get("kind") == "delete")
    missed = sum(1 for f in findings if f.get("kind") == "missed")
    if missed or relabels or deletes:
        parts.append(
            f"QA: {missed} possible missed, {relabels} mislabel(s), {deletes} "
            "duplicate(s) — review the suggestions below."
        )
    return " ".join(parts) if parts else "Done."


def _class_counts(items: list[dict[str, Any]]) -> dict[str, int]:
    """Per-class counts of detections/annotations, for grounding agent tool results."""
    counts: dict[str, int] = {}
    for item in items:
        name = (
            _value_string(item, "labelName", "label_name")
            or _value_string(item, "name", "name")
            or "object"
        )
        counts[name] = counts.get(name, 0) + 1
    return counts


def _summarize_by_class(predictions: list[dict[str, Any]]) -> str:
    counts: dict[str, int] = {}
    for prediction in predictions:
        name = (
            _value_string(prediction, "labelName", "label_name")
            or _value_string(prediction, "name", "name")
            or "object"
        )
        counts[name] = counts.get(name, 0) + 1
    # BTreeMap in Rust => sorted by class name; take 6.
    parts = [f"{count} {name}" for name, count in sorted(counts.items())][:6]
    return ", ".join(parts)


def _detection_boxes(detect_drafts: list[dict[str, Any]]) -> list[list[float]]:
    """The detect step's boxes (highest-confidence first, capped) for a segment-each
    step. Polygons are skipped."""
    scored: list[tuple[float, list[float]]] = []
    for draft in detect_drafts:
        if _value_string(draft, "type", "type") == "polygon":
            continue
        bbox = qa.bbox_from_value(draft)
        if bbox is None:
            continue
        confidence = draft.get("confidence")
        confidence = float(confidence) if isinstance(confidence, (int, float)) else 0.0
        scored.append((confidence, bbox))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [bbox for _, bbox in scored[:MAX_SEGMENT_FANOUT]]


def _dedupe_fresh(
    suggestions: list[str], existing_lower: set[str]
) -> tuple[list[str], int]:
    """Dedupe (case-insensitive, order-preserving) and drop names the project already
    has a label for. Returns (fresh[:MAX], already_have_count)."""
    seen: set[str] = set()
    fresh: list[str] = []
    already_have = 0
    for name in suggestions:
        key = name.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        if key in existing_lower:
            already_have += 1
            continue
        fresh.append(key)
    return fresh[: labels_mod.MAX_LABEL_SUGGESTIONS], already_have


def _join_human(items: list[str]) -> str:
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return f"{', '.join(items[:-1])} and {items[-1]}"


def _build_suggest_reply(
    fresh: list[str], sources: list[str], already_have: int, notes: list[str]
) -> str:
    parts: list[str] = []
    if not fresh:
        if already_have > 0:
            parts.append(
                f"Your project already has labels for everything I recognized here "
                f"({already_have} match{'' if already_have == 1 else 'es'})."
            )
        else:
            parts.append(
                "I couldn’t pick out clear object categories to label in this image."
            )
    else:
        source_text = f" (from {_join_human(sources)})" if sources else ""
        parts.append(
            f"Here are label names I’d suggest for this image{source_text} — tap one to "
            "add it to your project:"
        )
        if already_have > 0:
            parts.append(f"({already_have} more match labels you already have.)")
    parts.extend(notes)
    return " ".join(parts)


def _modality_noun(modality: str) -> str:
    return {
        "text": "text document",
        "tabular": "table row",
        "audio": "audio clip",
        "video": "video clip",
    }.get(modality, "item")


def _format_row(data: Any) -> str | None:
    if not isinstance(data, dict) or not data:
        return None
    lines = []
    for key, value in data.items():
        if isinstance(value, str):
            rendered = value
        elif value is None:
            rendered = ""
        else:
            rendered = str(value)
        lines.append(f"{key}: {rendered}")
    return "\n".join(lines)


def _generic_chat_system_prompt(modality: str, _task: str | None) -> str:
    noun = _modality_noun(modality)
    perception = (
        f" You cannot listen to or watch the {noun} yet (no audio/video model is "
        "loaded), so answer from the project context the user gives you and be upfront "
        "about that limit."
        if modality in ("audio", "video")
        else ""
    )
    return (
        "You are the AI labeling copilot inside VaiLabel Studio, an annotation tool that "
        f"runs entirely on the user's machine. You are helping the user label a {noun}. "
        "Answer concisely and concretely to help them label — suggest categories, "
        f"summarize, or answer questions about the content.{perception} Keep answers "
        "short and practical; no greeting or preamble, no markdown headers."
    )


def _generic_label_suggest_system_prompt(modality: str, task: str | None) -> str:
    noun = _modality_noun(modality)
    if task in ("ner", "relation_extraction"):
        kind = "entity types to tag"
    elif task in (
        "text_classification",
        "taxonomy",
        "audio_classification",
        "classification",
    ):
        kind = "categories to classify by"
    else:
        kind = "labels worth applying"
    return (
        f"You help a user set up a {noun} annotation project. Based on the content, list "
        f"the distinct {kind}. Reply with ONLY a comma-separated list of short, "
        "lowercase class names (for example: positive, negative, neutral). No numbers, "
        "no descriptions, no markdown — just the list. Give between 3 and 12 of the most "
        "useful, concrete options."
    )


def _generic_no_llm_reply(modality: str) -> str:
    noun = _modality_noun(modality)
    return (
        f"I help label this {noun} using a local model. Start a local model server (LM "
        "Studio, Ollama, or llama.cpp) and I’ll pick it up automatically — then I can "
        "suggest label names, summarize, and answer questions about the content. "
        "Everything stays on your machine."
    )


def _build_generic_suggest_reply(fresh: list[str], already_have: int) -> str:
    if not fresh:
        if already_have > 0:
            return (
                f"Your project already has labels for everything I’d suggest here "
                f"({already_have} match{'' if already_have == 1 else 'es'})."
            )
        return "I couldn’t pick out clear categories to suggest as labels here."
    reply = "Here are label names I’d suggest — tap one to add it to your project:"
    if already_have > 0:
        reply += f" ({already_have} more match labels you already have.)"
    return reply
