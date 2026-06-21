"""Unit tests for the copilot AI core (ports of the Rust crate's tests).

Pure + orchestrator-with-fakes; no torch/fastapi import, so this runs with a
bare Python:  `python -m unittest tests.test_copilot_core`  (cwd = runtime dir).
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from copilot import labels as labels_mod  # noqa: E402
from copilot import planning, qa, routing  # noqa: E402
from copilot.config import LlmConfig  # noqa: E402
from copilot.llm import LlmError  # noqa: E402
from copilot.orchestrator import (  # noqa: E402
    CopilotContext,
    CopilotService,
    TurnPayload,
)
from copilot.planning import PlanCapability  # noqa: E402
from copilot.routing import Capability  # noqa: E402


# --------------------------------- fakes ------------------------------------


class FakeLlm:
    def __init__(
        self,
        config=None,
        chat_reply=None,
        chat_json_reply=None,
        text_file=None,
        reachable=False,
        test_result=None,
    ):
        self._config = config
        self._chat_reply = chat_reply
        self._chat_json_reply = chat_json_reply
        self._text_file = text_file
        self._reachable = reachable
        self._test_result = test_result
        self.invalidated = False

    def resolve(self):
        return self._config

    def invalidate(self):
        self.invalidated = True

    def server_reachable(self, base_url):
        return self._reachable

    def chat(self, config, system, user_text, image_data_url=None):
        if self._chat_reply is None:
            raise LlmError("llm unavailable")
        return self._chat_reply

    def chat_json(self, config, system, user_text):
        if self._chat_json_reply is None:
            raise LlmError("llm unavailable")
        return self._chat_json_reply

    def image_data_url(self, path):
        return "data:image/png;base64,AAAA"

    def read_text_file(self, path):
        return self._text_file

    def test_connection(self, base_url, api_key):
        if self._test_result is None:
            raise LlmError("no server")
        if isinstance(self._test_result, Exception):
            raise self._test_result
        return self._test_result


class FakeInference:
    def __init__(
        self,
        detect_result=None,
        segment_result=None,
        low_conf_result=None,
        builtin_result=None,
    ):
        self._detect_result = detect_result
        self._segment_result = segment_result
        # Returned only when the copilot retries at a low confidence threshold.
        self._low_conf_result = low_conf_result
        # Returned only when the built-in detector ("rtdetr-l") is the fallback.
        self._builtin_result = builtin_result
        self.detect_calls = []

    def detect(self, image_path, model_path, target, conf=0.25):
        self.detect_calls.append((model_path, target))
        if isinstance(self._detect_result, Exception):
            raise self._detect_result
        if model_path == "rtdetr-l" and self._builtin_result is not None:
            return list(self._builtin_result)
        if conf <= 0.15 and self._low_conf_result is not None:
            return list(self._low_conf_result)
        return list(self._detect_result or [])

    def segment_boxes(self, image_path, sam_model_path, boxes, target):
        if isinstance(self._segment_result, Exception):
            raise self._segment_result
        return list(self._segment_result or [])


def llm_config(vision=False):
    return LlmConfig("auto", "http://localhost:1234/v1", "test-model", vision)


def detection(name):
    return {
        "name": name,
        "labelName": name,
        "type": "rectangle",
        "confidence": 0.9,
        "coordinates": [{"x": 0.0, "y": 0.0}, {"x": 10.0, "y": 10.0}],
    }


def box_value(id_, name, x0, y0, x1, y1):
    return {
        "id": id_,
        "name": name,
        "coordinates": [{"x": x0, "y": y0}, {"x": x1, "y": y1}],
    }


def service(llm, inference):
    return CopilotService(llm, inference)


# ------------------------------ pure: routing -------------------------------


class RoutingTests(unittest.TestCase):
    def test_routes_strong_qa_signal_over_detect(self):
        self.assertEqual(routing.route("check what I missed", []).capability, Capability.QA)
        self.assertEqual(
            routing.route("detect all objects", []).capability, Capability.DETECT
        )
        self.assertEqual(
            routing.route("describe this image", []).capability, Capability.DESCRIBE
        )
        self.assertEqual(routing.route("read the text", []).capability, Capability.OCR)
        self.assertEqual(routing.route("hello", []).capability, Capability.HELP)

    def test_routes_label_suggestion_requests(self):
        for message in (
            "suggest labels for this image",
            "recommend label names",
            "what labels should I use here",
            "what classes are in this image",
        ):
            self.assertEqual(
                routing.route(message, []).capability,
                Capability.SUGGEST_LABELS,
                msg=message,
            )
        self.assertEqual(routing.route("review my labels", []).capability, Capability.QA)

    def test_routes_auto_label_phrases_to_detect(self):
        for message in (
            "label this image",
            "auto label",
            "auto-label this",
            "label everything",
        ):
            self.assertEqual(
                routing.route(message, []).capability,
                Capability.DETECT,
                msg=message,
            )

    def test_extracts_class_target_from_labels(self):
        intent = routing.route("label all the cars", ["car", "person"])
        self.assertEqual(intent.capability, Capability.DETECT)
        self.assertEqual(intent.target, "car")

    def test_tool_gating_respects_the_enabled_set(self):
        self.assertTrue(routing.tool_enabled("detect", None))
        self.assertTrue(routing.tool_enabled("detect", []))
        self.assertTrue(routing.tool_enabled("qa_review", ["qa_review"]))
        self.assertFalse(routing.tool_enabled("detect", ["qa_review"]))
        self.assertTrue(routing.tool_enabled("help", ["qa_review"]))
        self.assertTrue(routing.tool_enabled("summarize", ["qa_review"]))
        self.assertEqual(PlanCapability.DETECT_ALL.tool_id(), "detect")
        self.assertEqual(PlanCapability.SEGMENT_EACH_DETECTION.tool_id(), "segment")


# ------------------------------- pure: labels -------------------------------


class LabelTests(unittest.TestCase):
    def test_parses_label_list_from_csv_json_and_bullets(self):
        self.assertEqual(
            labels_mod.parse_label_list(" Car, Person ,traffic light"),
            ["car", "person", "traffic light"],
        )
        self.assertEqual(
            labels_mod.parse_label_list('Sure! ["dog", "Cat", "dog"] are visible.'),
            ["dog", "cat"],
        )
        raw = (
            "1. bicycle\n2. Bicycle\n- bus\n* This image clearly shows a crowded street "
            "scene with many things"
        )
        self.assertEqual(labels_mod.parse_label_list(raw), ["bicycle", "bus"])
        self.assertLessEqual(len(labels_mod.parse_label_list("I can't tell.")), 1)


# --------------------------------- pure: qa ---------------------------------


class QaTests(unittest.TestCase):
    def test_qa_flags_missed_and_mislabel(self):
        detections = [
            box_value("d1", "car", 10.0, 10.0, 50.0, 50.0),
            box_value("d2", "person", 100.0, 100.0, 140.0, 160.0),
        ]
        annotations = [box_value("a1", "dog", 100.0, 100.0, 140.0, 160.0)]
        findings, actions = qa.qa_findings(detections, annotations)
        self.assertTrue(any(f["kind"] == "missed" for f in findings))
        self.assertTrue(
            any(a["kind"] == "relabel" and a["toLabel"] == "person" for a in actions)
        )

    def test_qa_flags_duplicate_boxes(self):
        annotations = [
            box_value("a1", "car", 10.0, 10.0, 100.0, 100.0),
            box_value("a2", "car", 11.0, 11.0, 101.0, 101.0),
        ]
        _findings, actions = qa.qa_findings([], annotations)
        self.assertTrue(
            any(a["kind"] == "delete" and a["annotationId"] == "a2" for a in actions)
        )


# ------------------------------- pure: planning -----------------------------


class PlanningTests(unittest.TestCase):
    def test_parses_a_chained_detect_segment_plan(self):
        plan = planning.parse_plan(
            '{"steps":[{"capability":"prompt_to_detect","target":"car"},'
            '{"capability":"segment_each_detection"}]}'
        )
        self.assertIsNotNone(plan)
        self.assertEqual(len(plan.steps), 2)
        self.assertEqual(plan.steps[0].capability, PlanCapability.PROMPT_TO_DETECT)
        self.assertEqual(plan.steps[0].target, "car")
        self.assertTrue(plan.steps[0].is_detect())
        self.assertEqual(plan.steps[1].capability, PlanCapability.SEGMENT_EACH_DETECTION)

    def test_parses_plan_wrapped_in_fences_and_prose(self):
        raw = (
            'Sure! Here is the plan:\n```json\n{"steps":[{"capability":"detect_all"}]}\n'
            "```\nHope that helps."
        )
        plan = planning.parse_plan(raw)
        self.assertIsNotNone(plan)
        self.assertEqual(len(plan.steps), 1)
        self.assertEqual(plan.steps[0].capability, PlanCapability.DETECT_ALL)

    def test_drops_unknown_capabilities_and_rejects_garbage(self):
        plan = planning.parse_plan(
            '{"steps":[{"capability":"teleport"},{"capability":"qa_review"}]}'
        )
        self.assertIsNotNone(plan)
        self.assertEqual(len(plan.steps), 1)
        self.assertEqual(plan.steps[0].capability, PlanCapability.QA_REVIEW)
        self.assertIsNone(planning.parse_plan('{"steps":[{"capability":"teleport"}]}'))
        self.assertIsNone(planning.parse_plan("I cannot help with that."))
        self.assertIsNone(planning.parse_plan(""))

    def test_route_to_plan_is_a_single_step_fallback(self):
        plan = planning.route_to_plan("find all cars", ["car"])
        self.assertEqual(len(plan.steps), 1)
        self.assertEqual(plan.steps[0].capability, PlanCapability.PROMPT_TO_DETECT)
        self.assertEqual(plan.steps[0].target, "car")
        plan = planning.route_to_plan("detect everything", [])
        self.assertEqual(plan.steps[0].capability, PlanCapability.DETECT_ALL)


# --------------------------- orchestrator (fakes) ---------------------------


class OrchestratorTests(unittest.TestCase):
    def test_turn_errors_when_the_image_is_missing(self):
        svc = service(FakeLlm(), FakeInference())
        with self.assertRaises(Exception):
            svc.turn(TurnPayload(item_id="img-1", message="detect objects"), CopilotContext())

    def test_detect_without_a_model_explains_how_to_add_one(self):
        ctx = CopilotContext(item={"id": "img-1", "projectId": "p1"})
        svc = service(FakeLlm(), FakeInference())
        result = svc.turn(TurnPayload(item_id="img-1", message="detect objects"), ctx)
        self.assertEqual(result["capability"], "detect")
        self.assertEqual(len(result["predictions"]), 0)
        self.assertIn("don't have a detection model", result["reply"])

    def test_detect_runs_the_detector_and_counts_predictions(self):
        ctx = CopilotContext(
            item={"id": "img-1", "projectId": "p1", "path": "/tmp/i.jpg"},
            detector_model_path="yolo",
        )
        inf = FakeInference(detect_result=[detection("car"), detection("car")])
        result = service(FakeLlm(), inf).turn(
            TurnPayload(item_id="img-1", message="detect objects"), ctx
        )
        self.assertEqual(result["capability"], "detect")
        self.assertEqual(len(result["predictions"]), 2)
        self.assertIn("2 car", result["reply"])  # deterministic fallback narration

    def test_detect_with_a_specific_class_filters_the_detector(self):
        ctx = CopilotContext(
            item={"id": "img-1", "projectId": "p1", "path": "/tmp/i.jpg"},
            detector_model_path="yolo",
            detector_class_names=["car", "person"],
        )
        inf = FakeInference(detect_result=[detection("car")])
        service(FakeLlm(), inf).turn(
            TurnPayload(item_id="img-1", message="find all cars"), ctx
        )
        self.assertEqual(len(inf.detect_calls), 1)
        self.assertEqual(inf.detect_calls[0][1], "car")

    def test_detect_retries_at_low_confidence(self):
        # Nothing at the default threshold, but the auto-retry at low confidence
        # surfaces a candidate — and the reply flags it for review.
        ctx = CopilotContext(
            item={"id": "img-1", "projectId": "p1", "path": "/tmp/i.jpg"},
            detector_model_path="yolo",
        )
        inf = FakeInference(detect_result=[], low_conf_result=[detection("car")])
        result = service(FakeLlm(), inf).turn(
            TurnPayload(item_id="img-1", message="detect objects"), ctx
        )
        self.assertEqual(result["capability"], "detect")
        self.assertEqual(len(result["predictions"]), 1)
        self.assertIn("lowered the confidence", result["reply"])
        self.assertEqual(len(inf.detect_calls), 2)  # default pass + low-conf retry

    def test_detect_falls_back_to_builtin_model(self):
        # The user's fine-tuned model ("yolo") finds nothing; the built-in detector
        # ("rtdetr-l") does — the copilot should use it and say so.
        ctx = CopilotContext(
            item={"id": "img-1", "projectId": "p1", "path": "/tmp/i.jpg"},
            detector_model_path="yolo",
            fallback_detector_model_path="rtdetr-l",
        )
        inf = FakeInference(detect_result=[], builtin_result=[detection("car")])
        result = service(FakeLlm(), inf).turn(
            TurnPayload(item_id="img-1", message="detect objects"), ctx
        )
        self.assertEqual(len(result["predictions"]), 1)
        self.assertIn("built-in detector", result["reply"])
        # Tried the user's model (default + low) then the built-in.
        self.assertIn(("rtdetr-l", None), inf.detect_calls)

    def test_no_builtin_fallback_when_active_is_already_builtin(self):
        # No fallback path provided (active model already is the built-in) → it just
        # routes to the training flywheel guidance.
        ctx = CopilotContext(
            item={"id": "img-1", "projectId": "p1", "path": "/tmp/i.jpg"},
            detector_model_path="rtdetr-l",
        )
        result = service(FakeLlm(), FakeInference(detect_result=[])).turn(
            TurnPayload(item_id="img-1", message="detect objects"), ctx
        )
        self.assertEqual(len(result["predictions"]), 0)
        self.assertIn("Model tab", result["reply"])

    def test_detect_empty_routes_to_training_flywheel(self):
        # Truly nothing (custom-domain image, COCO detector) → actionable guidance
        # that points at the train→auto-label flywheel, not "try another image".
        ctx = CopilotContext(
            item={"id": "img-1", "projectId": "p1", "path": "/tmp/i.jpg"},
            detector_model_path="yolo",
        )
        result = service(FakeLlm(), FakeInference(detect_result=[])).turn(
            TurnPayload(item_id="img-1", message="detect objects"), ctx
        )
        self.assertEqual(len(result["predictions"]), 0)
        self.assertIn("Model tab", result["reply"])
        self.assertIn("COCO", result["reply"])
        self.assertNotIn("try an image", result["reply"])

    def test_qa_flags_a_missed_detection(self):
        ctx = CopilotContext(
            item={"id": "img-1", "projectId": "p1", "path": "/tmp/i.jpg"},
            detector_model_path="yolo",
        )
        inf = FakeInference(detect_result=[detection("car")])
        result = service(FakeLlm(), inf).turn(
            TurnPayload(item_id="img-1", message="what did I miss"), ctx
        )
        self.assertEqual(result["capability"], "qa_review")
        self.assertTrue(any(f["kind"] == "missed" for f in result["findings"]))

    def test_disabled_tools_are_never_run(self):
        ctx = CopilotContext(
            item={"id": "img-1", "projectId": "p1", "path": "/tmp/i.jpg"},
            detector_model_path="yolo",
        )
        inf = FakeInference(detect_result=[detection("car")])
        payload = TurnPayload(
            item_id="img-1", message="detect objects", enabled_tools=["qa_review"]
        )
        result = service(FakeLlm(), inf).turn(payload, ctx)
        self.assertEqual(len(inf.detect_calls), 0)
        self.assertIn("turned off", result["reply"])

    def test_test_connection_reports_models_and_invalidates_cache(self):
        llm = FakeLlm(test_result=["m1", "m2"])
        result = CopilotService(llm, FakeInference()).test_connection(
            "http://localhost:1234", None
        )
        self.assertTrue(result["ok"])
        self.assertEqual(len(result["models"]), 2)
        self.assertIn("2 models", result["message"])
        self.assertTrue(llm.invalidated)

    def test_test_connection_surfaces_the_error_message(self):
        llm = FakeLlm(test_result=LlmError("Enter a server URL first."))
        result = service(llm, FakeInference()).test_connection("", None)
        self.assertFalse(result["ok"])
        self.assertEqual(result["message"], "Enter a server URL first.")

    # --- generic (non-image) path ---

    def test_generic_suggest_labels_offers_create_actions(self):
        llm = FakeLlm(config=llm_config(), chat_reply="positive, negative, neutral")
        ctx = CopilotContext(
            item={"id": "item-1", "projectId": "p1", "data": {"review": "great"}}
        )
        result = service(llm, FakeInference()).turn(
            TurnPayload(
                item_id="item-1", message="suggest labels", modality="tabular",
                project_id="p1",
            ),
            ctx,
        )
        self.assertEqual(result["capability"], "suggest_labels")
        names = [a["name"] for a in result["proposedActions"] if a["kind"] == "createLabel"]
        self.assertEqual(names, ["positive", "negative", "neutral"])

    def test_generic_chat_answers_with_the_llm(self):
        llm = FakeLlm(config=llm_config(), chat_reply="It reads as a positive review.")
        ctx = CopilotContext(item={"id": "item-1", "projectId": "p1", "path": "/tmp/doc.txt"})
        result = service(llm, FakeInference()).turn(
            TurnPayload(
                item_id="item-1", message="what is this about?", modality="text",
                project_id="p1",
            ),
            ctx,
        )
        self.assertEqual(result["capability"], "help")
        self.assertEqual(result["reply"], "It reads as a positive review.")
        self.assertEqual(len(result["predictions"]), 0)

    def test_generic_chat_without_an_llm_explains_setup(self):
        ctx = CopilotContext(item={"id": "item-1", "projectId": "p1"})
        result = service(FakeLlm(), FakeInference()).turn(
            TurnPayload(
                item_id="item-1", message="hello", modality="audio", project_id="p1"
            ),
            ctx,
        )
        self.assertEqual(result["capability"], "help")
        self.assertIn("local model", result["reply"])
        self.assertIn("audio clip", result["reply"])

    def test_generic_planner_picks_suggest_labels_from_context(self):
        llm = FakeLlm(
            config=llm_config(),
            chat_json_reply='{"tool":"suggest_labels"}',
            chat_reply="animal, vehicle, person",
        )
        ctx = CopilotContext(item={"id": "item-1", "projectId": "p1", "path": "/tmp/doc.txt"})
        result = service(llm, FakeInference()).turn(
            TurnPayload(
                item_id="item-1", message="what kinds of things appear here?",
                modality="text", project_id="p1",
            ),
            ctx,
        )
        self.assertEqual(result["capability"], "suggest_labels")
        self.assertEqual(len(result["proposedActions"]), 3)

    def test_generic_planner_overrides_keywords_for_chat(self):
        llm = FakeLlm(
            config=llm_config(),
            chat_json_reply='{"tool":"chat"}',
            chat_reply="Here's a summary.",
        )
        ctx = CopilotContext(item={"id": "item-1", "projectId": "p1", "path": "/tmp/doc.txt"})
        result = service(llm, FakeInference()).turn(
            TurnPayload(
                item_id="item-1",
                message="what classes are here — just summarize the doc",
                modality="text", project_id="p1",
            ),
            ctx,
        )
        self.assertEqual(result["capability"], "help")
        self.assertEqual(result["reply"], "Here's a summary.")

    def test_generic_turn_works_without_an_item(self):
        llm = FakeLlm(config=llm_config(), chat_reply="Here to help with this clip.")
        result = service(llm, FakeInference()).turn(
            TurnPayload(
                item_id="item-1", message="help me label this", modality="video",
                project_id="p1",
            ),
            CopilotContext(),  # item is None
        )
        self.assertEqual(result["capability"], "help")
        self.assertEqual(result["reply"], "Here to help with this clip.")


if __name__ == "__main__":
    unittest.main()
