"""Copilot endpoints — the AI core moved from the Rust `vailabel_copilot` crate.

`/copilot/turn` runs one chat turn; `/copilot/test-connection` probes a local
LLM server. The only client is the Rust bridge, which gathers the read-context
(item, labels, annotations, predictions, resolved model paths, LLM settings +
key) and persists the `predictions` drafts this returns.

The blocking work (local-LLM HTTP + torch) runs in a threadpool so the event
loop stays free, matching the inference router.
"""

from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from copilot.llm import LocalLlm
from copilot.orchestrator import (
    CopilotContext,
    CopilotError,
    CopilotService,
    TurnPayload,
)
from copilot.runtime_inference import RuntimeInference

router = APIRouter(prefix="/copilot")


class TurnRequest(BaseModel):
    # Plain dicts: the only caller is the trusted Rust bridge. Keys are camelCase.
    payload: dict[str, Any]
    context: dict[str, Any] = {}
    llmSettings: Optional[dict[str, Any]] = None


class TestConnectionRequest(BaseModel):
    baseUrl: str
    apiKey: Optional[str] = None


def _build_service(llm_settings: Optional[dict[str, Any]]) -> CopilotService:
    s = llm_settings or {}
    llm = LocalLlm(
        base_url=s.get("baseUrl"),
        model=s.get("model"),
        vision=s.get("vision"),
        api_key=s.get("apiKey"),
    )
    return CopilotService(llm, RuntimeInference())


def _turn_payload(p: dict[str, Any]) -> TurnPayload:
    return TurnPayload(
        item_id=p.get("itemId") or p.get("item_id") or "",
        message=p.get("message") or "",
        project_id=p.get("projectId") or p.get("project_id"),
        modality=p.get("modality"),
        task=p.get("task"),
        enabled_tools=p.get("enabledTools") or p.get("enabled_tools"),
        history=p.get("history"),
    )


def _context(c: dict[str, Any]) -> CopilotContext:
    return CopilotContext(
        item=c.get("item"),
        project_labels=c.get("projectLabels") or [],
        annotations=c.get("annotations") or [],
        predictions=c.get("predictions") or [],
        detector_model_path=c.get("detectorModelPath"),
        detector_class_names=c.get("detectorClassNames") or [],
        segmentation_model_path=c.get("segmentationModelPath"),
        fallback_detector_model_path=c.get("fallbackDetectorModelPath"),
    )


@router.post("/turn")
async def turn(req: TurnRequest):
    service = _build_service(req.llmSettings)
    payload = _turn_payload(req.payload)
    context = _context(req.context)
    try:
        return await run_in_threadpool(service.turn, payload, context)
    except CopilotError as exc:
        # e.g. "Image not found" — a real not-found, mapped like the Rust command.
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"copilot turn failed: {exc}")


@router.post("/test-connection")
async def test_connection(req: TestConnectionRequest):
    service = _build_service({"apiKey": req.apiKey})
    return await run_in_threadpool(service.test_connection, req.baseUrl, req.apiKey)
