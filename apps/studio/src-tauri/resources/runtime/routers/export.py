"""Model export endpoints (ONNX / TensorRT / OpenVINO).

Returns an `ExportResult { ok, output_path, error }`. Until an exporter is wired
it reports `ok: false` with an explanatory error (HTTP 200 so the caller can show
a friendly message instead of a hard failure).
"""

from typing import Dict

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/export")


class ExportReq(BaseModel):
    model_path: str
    format: str
    output_path: str
    opts: Dict = {}


def _not_wired(fmt: str, req: ExportReq):
    # from export.onnx import run; run(req); return {"ok": True, ...}
    return {
        "ok": False,
        "output_path": req.output_path,
        "error": f"{fmt} exporter is not installed in this runtime build",
    }


@router.post("/onnx")
async def onnx(req: ExportReq):
    return _not_wired("ONNX", req)


@router.post("/tensorrt")
async def tensorrt(req: ExportReq):
    return _not_wired("TensorRT", req)


@router.post("/openvino")
async def openvino(req: ExportReq):
    return _not_wired("OpenVINO", req)
