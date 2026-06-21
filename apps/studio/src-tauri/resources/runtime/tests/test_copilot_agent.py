"""Tests for the agentic tool-use loop (the "very good" copilot brain).

Drives `CopilotService.turn` with a fake LLM that emits OpenAI-style tool calls,
covering: grounded detect, tool chaining (detect→segment), conversation memory,
tool gating, and graceful fallback to the deterministic path on an LLM failure.
Runs with bare Python: `python -m unittest tests.test_copilot_agent`.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from copilot.config import LlmConfig  # noqa: E402
from copilot.llm import LlmError  # noqa: E402
from copilot.orchestrator import CopilotContext, CopilotService, TurnPayload  # noqa: E402


def cfg(vision=False):
    return LlmConfig("auto", "http://localhost:1234/v1", "tool-model", vision)


def tool_call(name, arguments="{}", id="c1"):
    return {"id": id, "type": "function", "function": {"name": name, "arguments": arguments}}


def assistant_tools(calls):
    return {"role": "assistant", "content": None, "tool_calls": calls}


def assistant_text(text):
    return {"role": "assistant", "content": text}


def detection(name):
    return {
        "name": name,
        "labelName": name,
        "type": "box",
        "confidence": 0.9,
        "coordinates": [{"x": 0.0, "y": 0.0}, {"x": 10.0, "y": 10.0}],
    }


def polygon(name="object"):
    return {
        "name": name,
        "labelName": name,
        "type": "polygon",
        "confidence": 1.0,
        "coordinates": [{"x": 0, "y": 0}, {"x": 5, "y": 0}, {"x": 5, "y": 5}],
    }


class FakeAgentLlm:
    """Scripts the tool-calling loop: each `chat_messages` call pops the next
    assistant message off the queue and records what it was sent."""

    def __init__(self, config, scripted, raise_error=False):
        self._config = config
        self._queue = list(scripted)
        self._raise = raise_error
        self.calls = []
        self.invalidated = False

    def resolve(self):
        return self._config

    def invalidate(self):
        self.invalidated = True

    def server_reachable(self, base_url):
        return True

    def chat_messages(self, config, messages, tools=None):
        if self._raise:
            raise LlmError("tools unsupported")
        self.calls.append({"messages": [dict(m) for m in messages], "tools": tools})
        return self._queue.pop(0) if self._queue else assistant_text("Done.")

    def image_data_url(self, path):
        return "data:image/png;base64,AAAA"

    # Deterministic-path stubs (used only on fallback).
    def chat(self, *a, **k):
        raise LlmError("n/a")

    def chat_json(self, *a, **k):
        raise LlmError("n/a")

    def read_text_file(self, path):
        return None

    def test_connection(self, base_url, api_key):
        return []


class FakeInference:
    def __init__(
        self,
        detect_result=None,
        segment_result=None,
        low_conf_result=None,
        builtin_result=None,
    ):
        self._detect = detect_result
        self._segment = segment_result
        self._low = low_conf_result
        self._builtin = builtin_result
        self.detect_calls = []

    def detect(self, image_path, model_path, target, conf=0.25):
        self.detect_calls.append((model_path, target))
        if model_path == "rtdetr-l" and self._builtin is not None:
            return list(self._builtin)
        if conf <= 0.15 and self._low is not None:
            return list(self._low)
        return list(self._detect or [])

    def segment_boxes(self, image_path, sam_model_path, boxes, target):
        return list(self._segment or [])


def image_ctx(**kw):
    base = dict(
        item={"id": "img-1", "projectId": "p1", "path": "/tmp/i.jpg"},
        detector_model_path="yolo",
    )
    base.update(kw)
    return CopilotContext(**base)


class AgentLoopTests(unittest.TestCase):
    def test_detect_via_tool_call_is_grounded(self):
        llm = FakeAgentLlm(
            cfg(),
            [
                assistant_tools([tool_call("detect_objects")]),
                assistant_text("I found 2 cars — they're on the canvas to accept."),
            ],
        )
        inf = FakeInference(detect_result=[detection("car"), detection("car")])
        result = CopilotService(llm, inf).turn(
            TurnPayload(item_id="img-1", message="what's in this image?"), image_ctx()
        )
        self.assertEqual(result["capability"], "agent")
        self.assertEqual(len(result["predictions"]), 2)
        self.assertIn("2 cars", result["reply"])
        # The detector actually ran (grounding), once, unfiltered.
        self.assertEqual(inf.detect_calls, [("yolo", None)])

    def test_detect_with_target_argument(self):
        llm = FakeAgentLlm(
            cfg(),
            [
                assistant_tools([tool_call("detect_objects", '{"target": "car"}')]),
                assistant_text("Found the cars."),
            ],
        )
        inf = FakeInference(detect_result=[detection("car")])
        CopilotService(llm, inf).turn(
            TurnPayload(item_id="img-1", message="find the cars"), image_ctx()
        )
        self.assertEqual(inf.detect_calls[0][1], "car")

    def test_chains_detect_then_segment(self):
        llm = FakeAgentLlm(
            cfg(),
            [
                assistant_tools([tool_call("detect_objects", id="c1")]),
                assistant_tools([tool_call("segment_detections", id="c2")]),
                assistant_text("Detected and outlined them."),
            ],
        )
        inf = FakeInference(
            detect_result=[detection("car"), detection("car")],
            segment_result=[polygon("car")],
        )
        result = CopilotService(llm, inf).turn(
            TurnPayload(item_id="img-1", message="find and outline the cars"),
            image_ctx(segmentation_model_path="sam"),
        )
        # 2 detection boxes + 1 polygon accumulated across the chained tools.
        self.assertEqual(len(result["predictions"]), 3)
        types = sorted(p["type"] for p in result["predictions"])
        self.assertEqual(types, ["box", "box", "polygon"])

    def test_conversation_history_is_replayed(self):
        llm = FakeAgentLlm(cfg(), [assistant_text("Sure.")])
        payload = TurnPayload(
            item_id="img-1",
            message="now outline them",
            history=[
                {"role": "user", "content": "detect cars"},
                {"role": "assistant", "content": "Found 3 cars."},
            ],
        )
        CopilotService(llm, FakeInference()).turn(payload, image_ctx())
        sent = llm.calls[0]["messages"]
        # system + 2 history + current user message.
        roles = [m["role"] for m in sent]
        self.assertEqual(roles[:4], ["system", "user", "assistant", "user"])
        self.assertEqual(sent[2]["content"], "Found 3 cars.")

    def test_tool_gating_limits_offered_tools(self):
        llm = FakeAgentLlm(cfg(), [assistant_text("ok")])
        payload = TurnPayload(
            item_id="img-1", message="hello", enabled_tools=["qa_review"]
        )
        CopilotService(llm, FakeInference()).turn(payload, image_ctx())
        offered = {t["function"]["name"] for t in llm.calls[0]["tools"]}
        # qa_review enabled + get_annotations always-on; detect/segment/suggest gated out.
        self.assertEqual(offered, {"qa_review", "get_annotations"})

    def test_detect_tool_auto_retries_at_low_confidence(self):
        # The detect_objects tool finds nothing at the default threshold but the
        # built-in low-confidence retry surfaces a candidate for the agent.
        llm = FakeAgentLlm(
            cfg(),
            [
                assistant_tools([tool_call("detect_objects")]),
                assistant_text("Found 1 at low confidence — please review."),
            ],
        )
        inf = FakeInference(detect_result=[], low_conf_result=[detection("car")])
        result = CopilotService(llm, inf).turn(
            TurnPayload(item_id="img-1", message="detect anything"), image_ctx()
        )
        self.assertEqual(len(result["predictions"]), 1)
        self.assertEqual(len(inf.detect_calls), 2)  # default + low-conf retry

    def test_detect_tool_falls_back_to_builtin_model(self):
        # In the agent loop too: user's model finds nothing → built-in detector runs.
        llm = FakeAgentLlm(
            cfg(),
            [
                assistant_tools([tool_call("detect_objects")]),
                assistant_text("Used the built-in detector — found 1."),
            ],
        )
        inf = FakeInference(detect_result=[], builtin_result=[detection("car")])
        result = CopilotService(llm, inf).turn(
            TurnPayload(item_id="img-1", message="detect objects"),
            image_ctx(fallback_detector_model_path="rtdetr-l"),
        )
        self.assertEqual(len(result["predictions"]), 1)
        self.assertIn(("rtdetr-l", None), inf.detect_calls)

    def test_detect_tool_honors_explicit_confidence(self):
        # An explicit confidence argument runs a single pass (no retry).
        llm = FakeAgentLlm(
            cfg(),
            [
                assistant_tools([tool_call("detect_objects", '{"confidence": 0.1}')]),
                assistant_text("Found them."),
            ],
        )
        inf = FakeInference(low_conf_result=[detection("car"), detection("car")])
        result = CopilotService(llm, inf).turn(
            TurnPayload(item_id="img-1", message="detect with low confidence"), image_ctx()
        )
        self.assertEqual(len(result["predictions"]), 2)
        self.assertEqual(len(inf.detect_calls), 1)  # explicit conf => single pass

    def test_leaked_tool_markers_become_a_grounded_summary(self):
        # Repro of the real bug: a weak model echoes the raw tool result with
        # template markers ("[TOOL_RESULT] 12 [END_TOOL_RESULT]") instead of a
        # sentence. The detections are real; the reply must be a clean summary.
        llm = FakeAgentLlm(
            cfg(),
            [
                assistant_tools([tool_call("detect_objects")]),
                assistant_text("[TOOL_RESULT] 12 [END_TOOL_RESULT]"),
            ],
        )
        inf = FakeInference(detect_result=[detection("car")] * 12)
        result = CopilotService(llm, inf).turn(
            TurnPayload(item_id="img-1", message="detect objects"), image_ctx()
        )
        self.assertEqual(len(result["predictions"]), 12)
        self.assertNotIn("TOOL_RESULT", result["reply"])
        self.assertIn("Detected 12", result["reply"])

    def test_clean_model_reply_is_preserved(self):
        # A normal sentence must pass through untouched (no false-positive scrubbing).
        llm = FakeAgentLlm(
            cfg(),
            [
                assistant_tools([tool_call("detect_objects")]),
                assistant_text("I found 2 cars — they're on the canvas to accept."),
            ],
        )
        inf = FakeInference(detect_result=[detection("car"), detection("car")])
        result = CopilotService(llm, inf).turn(
            TurnPayload(item_id="img-1", message="detect objects"), image_ctx()
        )
        self.assertEqual(result["reply"], "I found 2 cars — they're on the canvas to accept.")

    def test_model_chats_instead_of_acting_runs_engine_anyway(self):
        # The reported failure: a weak model just replies with text and never calls
        # a tool on a clear "detect" request. The copilot must still run the detector
        # so predictions land on the canvas for approval — not show empty chatter.
        llm = FakeAgentLlm(
            cfg(), [assistant_text("Sure, I can help you detect objects!")]
        )
        inf = FakeInference(detect_result=[detection("car"), detection("car")])
        result = CopilotService(llm, inf).turn(
            TurnPayload(item_id="img-1", message="detect objects"), image_ctx()
        )
        self.assertEqual(result["capability"], "detect")  # deterministic engine ran
        self.assertEqual(len(result["predictions"]), 2)

    def test_chatty_reply_kept_when_not_an_action_request(self):
        # A non-action question ("what's the weather") that the model answers with
        # text is fine — no forced detection.
        llm = FakeAgentLlm(cfg(), [assistant_text("I help you label images.")])
        result = CopilotService(llm, FakeInference()).turn(
            TurnPayload(item_id="img-1", message="who are you?"), image_ctx()
        )
        self.assertEqual(result["reply"], "I help you label images.")
        self.assertEqual(len(result["predictions"]), 0)

    def test_falls_back_to_deterministic_on_llm_error(self):
        # The model can't tool-call (server errors) → degrade to the keyword path,
        # which still runs the detector deterministically.
        llm = FakeAgentLlm(cfg(), [], raise_error=True)
        inf = FakeInference(detect_result=[detection("car"), detection("car")])
        result = CopilotService(llm, inf).turn(
            TurnPayload(item_id="img-1", message="detect objects"), image_ctx()
        )
        self.assertEqual(result["capability"], "detect")
        self.assertEqual(len(result["predictions"]), 2)


if __name__ == "__main__":
    unittest.main()
