"""Shared export plumbing built on ultralytics' `model.export(format=…)`.

Every exporter returns an ExportResult dict `{ok, output_path, error}` and NEVER
raises — a missing toolchain becomes `ok: false` with a `pip install` hint
(HTTP 200 by contract; the Rust `export_*` command keys off `ok`).
"""

import os
import shutil
from typing import Any, Dict, Optional

from inference.loader import RuntimeDependencyError, infer_family, lazy_import

# ultralytics export() kwargs we forward from req.opts when present.
_PASSTHROUGH = (
    "imgsz",
    "half",
    "int8",
    "dynamic",
    "simplify",
    "opset",
    "batch",
    "device",
    "workspace",
    "nms",
)


def _load(model_path: str):
    ultra = lazy_import("ultralytics", "ultralytics")
    family = infer_family(model_path)
    return ultra.RTDETR(model_path) if family == "rtdetr" else ultra.YOLO(model_path)


def _finalize(produced: Any, output_path: str) -> str:
    """Move/copy the artifact ultralytics produced to the requested output path."""
    src = str(produced)
    if not output_path:
        return src
    parent = os.path.dirname(output_path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    if os.path.abspath(src) != os.path.abspath(output_path):
        if os.path.isdir(src):
            if os.path.exists(output_path):
                shutil.rmtree(output_path, ignore_errors=True)
            shutil.move(src, output_path)
        else:
            shutil.move(src, output_path)
    return output_path


def export_to(
    req: Any,
    fmt: str,
    requires: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Export `req.model_path` to `fmt`, returning an ExportResult dict.

    `requires` is an optional {module: pip} pre-check for formats whose toolchain
    must be importable (TensorRT, OpenVINO) so we fail with a precise message
    rather than deep inside ultralytics.
    """
    try:
        for module, pip in (requires or {}).items():
            lazy_import(module, pip)  # raises RuntimeDependencyError if absent

        model = _load(req.model_path)
        opts = req.opts if isinstance(getattr(req, "opts", None), dict) else {}
        kwargs: Dict[str, Any] = {"format": fmt}
        for key in _PASSTHROUGH:
            if key in opts:
                kwargs[key] = opts[key]

        produced = model.export(**kwargs)
        final = _finalize(produced, getattr(req, "output_path", "") or "")
        return {"ok": True, "output_path": final, "error": None}
    except RuntimeDependencyError as exc:
        return {"ok": False, "output_path": getattr(req, "output_path", ""), "error": str(exc)}
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "output_path": getattr(req, "output_path", ""),
            "error": f"{fmt} export failed: {exc}",
        }
