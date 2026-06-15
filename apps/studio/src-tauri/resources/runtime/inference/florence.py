"""Florence-2 (transformers) — captioning, OCR-with-region, and grounded detection.

`model_path` must be a local Florence-2 snapshot directory (a multi-file HF
repo), not a single weight file. Each public `run_*` returns the response shape
its endpoint expects: caption → `{text}`, ocr → `{lines}`, detect → `{detections}`.
"""

from typing import Any, Dict, List, Optional, Tuple

from inference.loader import CACHE, draft, lazy_import, load_image

CAPTION_TASK = "<MORE_DETAILED_CAPTION>"
OCR_TASK = "<OCR_WITH_REGION>"
DETECT_TASK = "<OD>"
GROUNDING_TASK = "<CAPTION_TO_PHRASE_GROUNDING>"


def _load(model_path: str):
    transformers = lazy_import("transformers", "transformers")
    torch = lazy_import("torch")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32
    model = (
        transformers.AutoModelForCausalLM.from_pretrained(
            model_path, trust_remote_code=True, torch_dtype=dtype
        )
        .to(device)
        .eval()
    )
    processor = transformers.AutoProcessor.from_pretrained(model_path, trust_remote_code=True)
    return model, processor, device, dtype


def _generate(req: Any, task: str, text_input: Optional[str] = None) -> Tuple[Any, Tuple[int, int]]:
    """Run one Florence-2 task; return (parsed_result, (width, height))."""
    model, processor, device, dtype = CACHE.get_or_load(
        f"florence:{req.model_path}", lambda: _load(req.model_path)
    )
    image, size = load_image(req.image_path)
    prompt = task + (text_input or "")
    inputs = processor(text=prompt, images=image, return_tensors="pt").to(device, dtype)
    generated_ids = model.generate(
        input_ids=inputs["input_ids"],
        pixel_values=inputs["pixel_values"],
        max_new_tokens=1024,
        num_beams=3,
        do_sample=False,
    )
    text = processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
    parsed = processor.post_process_generation(text, task=task, image_size=size)
    return parsed.get(task, parsed), size


def run_caption(req: Any) -> Dict[str, Any]:
    prompt = (getattr(req, "prompt", None) or "").strip()
    if prompt:
        # A prompt turns this into grounded phrase captioning; surface its text.
        result, _ = _generate(req, GROUNDING_TASK, prompt)
        text = result if isinstance(result, str) else str(result)
    else:
        result, _ = _generate(req, CAPTION_TASK)
        text = result if isinstance(result, str) else str(result)
    return {"text": text}


def run_ocr(req: Any) -> Dict[str, Any]:
    result, _ = _generate(req, OCR_TASK)
    quad_boxes = (result or {}).get("quad_boxes", []) if isinstance(result, dict) else []
    labels = (result or {}).get("labels", []) if isinstance(result, dict) else []
    lines: List[Dict[str, Any]] = []
    for idx, quad in enumerate(quad_boxes):
        coords = [
            {"x": float(quad[i]), "y": float(quad[i + 1])}
            for i in range(0, len(quad) - 1, 2)
        ]
        text = labels[idx] if idx < len(labels) else ""
        lines.append({"text": text, "confidence": 1.0, "coordinates": coords})
    return {"lines": lines}


def run_detect(req: Any) -> Dict[str, Any]:
    text_input = (getattr(req, "prompt", None) or "").strip() or None
    task = GROUNDING_TASK if text_input else DETECT_TASK
    result, _ = _generate(req, task, text_input)
    bboxes = (result or {}).get("bboxes", []) if isinstance(result, dict) else []
    labels = (result or {}).get("labels", []) if isinstance(result, dict) else []
    detections: List[Dict[str, Any]] = []
    for idx, bbox in enumerate(bboxes):
        x1, y1, x2, y2 = (float(v) for v in bbox[:4])
        name = labels[idx] if idx < len(labels) else "object"
        coords = [{"x": x1, "y": y1}, {"x": x2, "y": y2}]
        detections.append(draft(name, "box", coords, 1.0))
    return {"detections": detections}
