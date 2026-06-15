"""Model export endpoints (ONNX / TensorRT / OpenVINO).

Each returns an `ExportResult { ok, output_path, error }`. Exporters never raise:
a missing toolchain reports `ok: false` (HTTP 200) so the caller can show a
friendly message instead of a hard failure. The blocking export runs in a
threadpool so the event loop stays free.
"""

from typing import Dict

from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from export import onnx, openvino, tensorrt

router = APIRouter(prefix="/export")


class ExportReq(BaseModel):
    model_path: str
    format: str
    output_path: str
    opts: Dict = {}


@router.post("/onnx")
async def export_onnx(req: ExportReq):
    return await run_in_threadpool(onnx.run, req)


@router.post("/tensorrt")
async def export_tensorrt(req: ExportReq):
    return await run_in_threadpool(tensorrt.run, req)


@router.post("/openvino")
async def export_openvino(req: ExportReq):
    return await run_in_threadpool(openvino.run, req)
