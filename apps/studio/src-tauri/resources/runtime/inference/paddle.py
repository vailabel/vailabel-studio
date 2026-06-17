"""OCR via PaddleOCR.

Returns `{"lines": [{text, confidence, coordinates:[{x,y}×4]}, …]}` — one entry
per detected text line with its quadrilateral box in pixel space.

`model_path` may be a PaddleOCR model directory; when empty PaddleOCR falls back
to its own bundled English models.
"""

from typing import Any, Dict, List

from inference.loader import CACHE, lazy_import, pick_device


def _load(model_path: str):
    paddleocr = lazy_import("paddleocr", "paddleocr")
    # Use the GPU when a CUDA-capable runtime is present; PaddleOCR falls back to
    # CPU on its own if the GPU build isn't installed.
    kwargs: Dict[str, Any] = {
        "use_angle_cls": True,
        "lang": "en",
        "show_log": False,
        "use_gpu": pick_device() == "cuda",
    }
    return paddleocr.PaddleOCR(**kwargs)


def run(req: Any) -> Dict[str, Any]:
    ocr = CACHE.get_or_load("paddleocr", lambda: _load(getattr(req, "model_path", "")))
    result = ocr.ocr(req.image_path, cls=True)

    lines: List[Dict[str, Any]] = []
    for page in result or []:
        for entry in page or []:
            box = entry[0]
            text, conf = entry[1][0], entry[1][1]
            coords = [{"x": float(p[0]), "y": float(p[1])} for p in box]
            lines.append({"text": text, "confidence": float(conf), "coordinates": coords})
    return {"lines": lines}
