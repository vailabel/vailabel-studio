"""Promptable segmentation via ultralytics `SAM` (loads SAM / SAM2 `.pt` weights).

ultralytics' SAM wrapper accepts point and box prompts and returns masks, which
we trace into polygons — far more robust than hand-wiring SAM2 configs, and it
reuses the ultralytics dependency the detect/train paths already need.

Returns `{"masks": [InferenceAnnotationDraft, …]}` with `type: "polygon"`.
"""

from typing import Any, Dict, List

from inference.loader import CACHE, draft, lazy_import, mask_to_polygon, pick_device


def _load(model_path: str):
    ultra = lazy_import("ultralytics", "ultralytics")
    return ultra.SAM(model_path)


def run(req: Any) -> Dict[str, Any]:
    model = CACHE.get_or_load(f"segment:{req.model_path}", lambda: _load(req.model_path))

    kwargs: Dict[str, Any] = {"device": pick_device(), "verbose": False}
    points = [list(p) for p in (getattr(req, "points", None) or [])]
    if points:
        kwargs["points"] = points
        kwargs["labels"] = [1] * len(points)  # all foreground clicks
    box = getattr(req, "box_xyxy", None)
    if box:
        kwargs["bboxes"] = [list(box)]

    results = model.predict(req.image_path, **kwargs)

    masks_out: List[Dict[str, Any]] = []
    for res in results:
        masks = getattr(res, "masks", None)
        if masks is None or getattr(masks, "data", None) is None:
            continue
        data = masks.data  # tensor [N, H, W]
        for i in range(int(data.shape[0])):
            poly = mask_to_polygon(data[i].cpu().numpy())
            if not poly:
                continue
            masks_out.append(draft("object", "polygon", poly, 1.0))
    return {"masks": masks_out}
