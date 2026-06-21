"""The real `CopilotInferencePort` for the runtime: detect/segment compute run
in-process over the existing `inference/` adapters.

This is the only copilot module that touches torch/ultralytics (lazily, via the
adapters). It returns raw `InferenceAnnotationDraft` dicts; Rust persists them.
Failures become `CopilotError` carrying a bare, user-facing message, which the
orchestrator surfaces as reply text (parity with the Rust path).
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

from inference import detect, florence, segment
from inference.loader import RuntimeDependencyError, infer_family

from .orchestrator import CopilotError

#: Matches ultralytics' predict default + the Rust copilot detect threshold.
_DEFAULT_CONF = 0.25


def _class_token_matches(a: str, b: str) -> bool:
    if not a or not b:
        return False
    return a == b or f"{a}s" == b or f"{b}s" == a


def _draft_matches_class(draft: dict[str, Any], target: str) -> bool:
    """Port of Rust `draft_matches_class`: keep a draft whose class name matches the
    target (singular/plural tolerant)."""
    target = target.strip().lower()
    if not target:
        return True
    name = str(draft.get("name") or "").strip().lower()
    label = str(draft.get("labelName") or draft.get("label_name") or "").strip().lower()
    return _class_token_matches(name, target) or _class_token_matches(label, target)


class RuntimeInference:
    """Detect/segment over the embedded models. One instance per turn is fine —
    the heavy models live in the process-wide `inference.loader.CACHE`."""

    def detect(
        self,
        image_path: str,
        model_path: str,
        target: str | None,
        conf: float = _DEFAULT_CONF,
    ) -> list[dict[str, Any]]:
        req = SimpleNamespace(
            model_path=model_path,
            image_path=image_path,
            conf=conf,
            iou=None,
            family=None,
            prompt=None,
        )
        family = infer_family(model_path, None)
        fn = florence.run_detect if family == "florence2" else detect.run
        try:
            result = fn(req)
        except RuntimeDependencyError as exc:
            raise CopilotError(str(exc)) from exc
        except FileNotFoundError as exc:
            raise CopilotError(str(exc)) from exc
        except Exception as exc:  # noqa: BLE001 — surfaced to the user as reply text
            raise CopilotError(f"detection failed: {exc}") from exc

        detections = result.get("detections", []) if isinstance(result, dict) else []
        if target:
            detections = [d for d in detections if _draft_matches_class(d, target)]
        return detections

    def segment_boxes(
        self,
        image_path: str,
        sam_model_path: str | None,
        boxes: list[list[float]],
        target: str | None,
    ) -> list[dict[str, Any]]:
        if not sam_model_path:
            raise CopilotError(
                "No segmentation model is installed. Install MobileSAM on the AI Models "
                "page to outline detections."
            )
        masks: list[dict[str, Any]] = []
        for box in boxes:
            req = SimpleNamespace(
                model_path=sam_model_path,
                image_path=image_path,
                points=[],
                box_xyxy=list(box),
                family=None,
            )
            try:
                result = segment.run(req)
            except RuntimeDependencyError as exc:
                raise CopilotError(str(exc)) from exc
            except FileNotFoundError as exc:
                raise CopilotError(str(exc)) from exc
            except Exception as exc:  # noqa: BLE001
                raise CopilotError(f"segmentation failed: {exc}") from exc
            for mask in result.get("masks", []) if isinstance(result, dict) else []:
                if target:
                    mask["name"] = target
                    mask["labelName"] = target
                masks.append(mask)
        return masks
