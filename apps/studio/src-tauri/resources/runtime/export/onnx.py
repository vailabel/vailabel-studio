"""ONNX export — works everywhere ultralytics + onnx are installed."""

from typing import Any, Dict

from export._common import export_to


def run(req: Any) -> Dict[str, Any]:
    return export_to(req, "onnx", requires={"onnx": "onnx"})
