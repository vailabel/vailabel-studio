"""TensorRT export (ultralytics `format="engine"`).

Requires the NVIDIA TensorRT toolchain (the `tensorrt` wheel) and a CUDA GPU at
export time; when absent we report `ok: false` with an install hint.
"""

from typing import Any, Dict

from export._common import export_to


def run(req: Any) -> Dict[str, Any]:
    return export_to(req, "engine", requires={"tensorrt": "tensorrt"})
