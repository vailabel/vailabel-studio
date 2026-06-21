"""QA-diff logic: compare detector output against existing annotations and
produce findings + the fixes the user can approve. Plus the proposed-action and
finding wire shapes. Faithful port of `domain/qa.rs`.

Findings and actions are emitted as plain dicts in the exact camelCase shape the
Rust enums serialized to, so the frontend contract is unchanged:
- QaFinding:  {"kind", "message", "annotationId"?}
- Relabel:    {"kind": "relabel", "annotationId", "toLabel", "message"}
- Delete:     {"kind": "delete", "annotationId", "message"}
- CreateLabel:{"kind": "createLabel", "name", "color", "projectId", "message"}
"""

from __future__ import annotations

from typing import Any

# ----------------------------- wire-shape builders -----------------------------


def finding(kind: str, message: str, annotation_id: str | None = None) -> dict[str, Any]:
    out: dict[str, Any] = {"kind": kind, "message": message}
    if annotation_id is not None:
        out["annotationId"] = annotation_id
    return out


def relabel_action(annotation_id: str, to_label: str, message: str) -> dict[str, Any]:
    return {
        "kind": "relabel",
        "annotationId": annotation_id,
        "toLabel": to_label,
        "message": message,
    }


def delete_action(annotation_id: str, message: str) -> dict[str, Any]:
    return {"kind": "delete", "annotationId": annotation_id, "message": message}


def create_label_action(
    name: str, color: str, project_id: str, message: str
) -> dict[str, Any]:
    return {
        "kind": "createLabel",
        "name": name,
        "color": color,
        "projectId": project_id,
        "message": message,
    }


# ------------------------------- geometry helpers ------------------------------


def _value_string(value: dict[str, Any], camel: str, snake: str) -> str | None:
    """Read a string field by its camelCase or snake_case key."""
    got = value.get(camel)
    if not isinstance(got, str):
        got = value.get(snake)
    return got if isinstance(got, str) else None


def bbox_from_value(value: dict[str, Any]) -> list[float] | None:
    """Axis-aligned bounding box `[x0, y0, x1, y1]` from a coordinate array entity."""
    coords = value.get("coordinates")
    if not isinstance(coords, list) or len(coords) < 2:
        return None
    p0, p1 = coords[0], coords[1]
    if not isinstance(p0, dict) or not isinstance(p1, dict):
        return None
    try:
        x0 = float(p0["x"])
        y0 = float(p0["y"])
        x1 = float(p1["x"])
        y1 = float(p1["y"])
    except (KeyError, TypeError, ValueError):
        return None
    return [min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)]


def _class_name(value: dict[str, Any]) -> str:
    return (
        _value_string(value, "labelName", "label_name")
        or _value_string(value, "name", "name")
        or ""
    )


def _iou(a: list[float], b: list[float]) -> float:
    left = max(a[0], b[0])
    top = max(a[1], b[1])
    right = min(a[2], b[2])
    bottom = min(a[3], b[3])
    if right <= left or bottom <= top:
        return 0.0
    overlap = (right - left) * (bottom - top)
    area_a = (a[2] - a[0]) * (a[3] - a[1])
    area_b = (b[2] - b[0]) * (b[3] - b[1])
    denom = area_a + area_b - overlap
    return overlap / (denom if denom > 0 else 1e-7)


def qa_findings(
    detections: list[dict[str, Any]], annotations: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Compare detector output against the image's existing annotations and produce
    QA findings + the fixes the user can approve."""
    ann_boxes: list[tuple[str, str, list[float]]] = []
    for annotation in annotations:
        ann_id = _value_string(annotation, "id", "id")
        bbox = bbox_from_value(annotation)
        if ann_id is None or bbox is None:
            continue
        ann_boxes.append((ann_id, _class_name(annotation).lower(), bbox))

    findings: list[dict[str, Any]] = []
    actions: list[dict[str, Any]] = []

    for detection in detections:
        det_box = bbox_from_value(detection)
        if det_box is None:
            continue
        det_name = _class_name(detection)

        best_iou = 0.0
        best_idx: int | None = None
        for index, (_, _, ann_box) in enumerate(ann_boxes):
            value = _iou(det_box, ann_box)
            if value > best_iou:
                best_iou = value
                best_idx = index

        if best_iou < 0.4:
            if sum(1 for f in findings if f["kind"] == "missed") < 12:
                label = det_name if det_name else "object"
                findings.append(finding("missed", f"Possible missed {label}"))
        elif best_iou >= 0.6 and best_idx is not None:
            ann_id, ann_class, _ = ann_boxes[best_idx]
            det_lower = det_name.lower()
            if det_lower and ann_class and ann_class != det_lower:
                message = f"Box labeled “{ann_class}” looks like “{det_lower}”"
                findings.append(finding("mislabel", message, ann_id))
                actions.append(relabel_action(ann_id, det_name, message))

    # Near-duplicate existing annotations.
    for i in range(len(ann_boxes)):
        for j in range(i + 1, len(ann_boxes)):
            if _iou(ann_boxes[i][2], ann_boxes[j][2]) > 0.9:
                dup_id = ann_boxes[j][0]
                already = any(
                    a["kind"] == "delete" and a["annotationId"] == dup_id for a in actions
                )
                if not already:
                    message = "Two near-duplicate boxes overlap"
                    findings.append(finding("duplicate", message, dup_id))
                    actions.append(delete_action(dup_id, message))

    return findings, actions
