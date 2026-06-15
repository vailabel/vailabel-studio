"""OpenVINO export (ultralytics `format="openvino"`).

Requires the `openvino` wheel; when absent we report `ok: false` with a hint.
"""

from typing import Any, Dict

from export._common import export_to


def run(req: Any) -> Dict[str, Any]:
    return export_to(req, "openvino", requires={"openvino": "openvino"})
