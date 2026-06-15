"""Object detection via ultralytics (YOLO / RT-DETR).

Returns `{"detections": [InferenceAnnotationDraft, …]}` with `type: "box"` and
pixel-space xyxy coordinates, so results drop into the studio's predictions flow.
"""

from typing import Any, Dict

from inference.loader import (
    CACHE,
    draft,
    infer_family,
    lazy_import,
    pick_device,
    xyxy_to_points,
)


def _load(model_path: str, family: str):
    ultra = lazy_import("ultralytics", "ultralytics")
    if family == "rtdetr":
        return ultra.RTDETR(model_path)
    return ultra.YOLO(model_path)


def run(req: Any) -> Dict[str, Any]:
    family = infer_family(req.model_path, getattr(req, "family", None))
    model = CACHE.get_or_load(
        f"detect:{family}:{req.model_path}",
        lambda: _load(req.model_path, family),
    )

    kwargs: Dict[str, Any] = {"device": pick_device(), "verbose": False}
    if getattr(req, "conf", None) is not None:
        kwargs["conf"] = float(req.conf)
    if getattr(req, "iou", None) is not None:
        kwargs["iou"] = float(req.iou)

    results = model.predict(req.image_path, **kwargs)

    detections = []
    for res in results:
        names = getattr(res, "names", {}) or {}
        boxes = getattr(res, "boxes", None)
        if boxes is None:
            continue
        for box in boxes:
            x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
            cls_id = int(box.cls[0].item()) if box.cls is not None else -1
            conf = float(box.conf[0].item()) if box.conf is not None else 0.0
            label = names.get(cls_id, str(cls_id)) if isinstance(names, dict) else str(cls_id)
            item = draft(label, "box", xyxy_to_points(x1, y1, x2, y2), conf)
            item["classId"] = cls_id
            detections.append(item)
    return {"detections": detections}
