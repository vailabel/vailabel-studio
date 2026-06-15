"""Inference endpoints for heavyweight models (RT-DETR, SAM2, Florence-2, etc.).

These route to per-family adapters under `inference/`. Until an adapter is
installed the endpoint returns HTTP 501 so the caller surfaces a clear "not
wired yet" error rather than silently returning empty results.
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/inference")
ocr_router = APIRouter()


class DetectReq(BaseModel):
    model_path: str
    image_path: str
    conf: Optional[float] = None
    iou: Optional[float] = None


class SegmentReq(BaseModel):
    model_path: str
    image_path: str
    points: List[List[float]] = []
    box_xyxy: Optional[List[float]] = None


class CaptionReq(BaseModel):
    model_path: str
    image_path: str
    prompt: Optional[str] = None


class OcrReq(BaseModel):
    model_path: str
    image_path: str


def _not_wired(name: str):
    raise HTTPException(
        status_code=501,
        detail=f"{name} adapter is not installed in this runtime build",
    )


@router.post("/object-detection")
async def object_detection(req: DetectReq):
    # from inference.rtdetr import run; return {"detections": run(req)}
    _not_wired("object-detection")


@router.post("/segmentation")
async def segmentation(req: SegmentReq):
    _not_wired("segmentation")


@router.post("/caption")
async def caption(req: CaptionReq):
    _not_wired("caption")


@ocr_router.post("/ocr")
async def ocr(req: OcrReq):
    _not_wired("ocr")
