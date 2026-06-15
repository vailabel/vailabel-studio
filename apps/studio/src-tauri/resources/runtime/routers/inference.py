"""Inference endpoints for heavyweight models (RT-DETR, SAM2, Florence-2, etc.).

Each endpoint resolves the model family (explicit hint, else from `model_path`)
and dispatches to a per-family adapter under `inference/`. The blocking torch
work runs in a threadpool so the event loop stays free. A missing family
dependency surfaces as HTTP 501 with a `pip install` hint; other failures as 500.
"""

from typing import Any, Callable, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from inference import detect, florence, paddle, qwen, segment
from inference.loader import RuntimeDependencyError, infer_family

router = APIRouter(prefix="/inference")
ocr_router = APIRouter()


class DetectReq(BaseModel):
    model_path: str
    image_path: str
    conf: Optional[float] = None
    iou: Optional[float] = None
    # Optional, additive — the Rust client doesn't send these yet; when absent
    # the family is inferred from `model_path`.
    family: Optional[str] = None
    prompt: Optional[str] = None


class SegmentReq(BaseModel):
    model_path: str
    image_path: str
    points: List[List[float]] = []
    box_xyxy: Optional[List[float]] = None
    family: Optional[str] = None


class CaptionReq(BaseModel):
    model_path: str
    image_path: str
    prompt: Optional[str] = None
    family: Optional[str] = None


class OcrReq(BaseModel):
    model_path: str
    image_path: str
    family: Optional[str] = None


async def _dispatch(fn: Callable[[Any], Any], req: Any):
    """Run an adapter off the event loop and normalize failures to HTTP errors."""
    try:
        return await run_in_threadpool(fn, req)
    except RuntimeDependencyError as exc:
        raise HTTPException(status_code=501, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"inference failed: {exc}")


@router.post("/object-detection")
async def object_detection(req: DetectReq):
    family = infer_family(req.model_path, req.family)
    fn = florence.run_detect if family == "florence2" else detect.run
    return await _dispatch(fn, req)


@router.post("/segmentation")
async def segmentation(req: SegmentReq):
    return await _dispatch(segment.run, req)


@router.post("/caption")
async def caption(req: CaptionReq):
    family = infer_family(req.model_path, req.family)
    fn = qwen.run_caption if family == "qwen" else florence.run_caption
    return await _dispatch(fn, req)


@ocr_router.post("/ocr")
async def ocr(req: OcrReq):
    family = infer_family(req.model_path, req.family)
    fn = florence.run_ocr if family == "florence2" else paddle.run
    return await _dispatch(fn, req)
