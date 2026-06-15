//! QA-diff logic: compare detector output against existing annotations and
//! produce findings + the fixes the user can approve. Plus the proposed-action,
//! finding, and turn-result DTOs the copilot returns. Pure — no model needed
//! beyond the detection/annotation JSON passed in.

use serde::Serialize;
use serde_json::Value;

use super::routing::Capability;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QaFinding {
    /// missed | mislabel | duplicate
    pub kind: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub annotation_id: Option<String>,
}

/// A mutation the copilot proposes; applied only after the user approves it.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ProposedAction {
    #[serde(rename_all = "camelCase")]
    Relabel {
        annotation_id: String,
        to_label: String,
        message: String,
    },
    #[serde(rename_all = "camelCase")]
    Delete {
        annotation_id: String,
        message: String,
    },
    /// Create a new project label the copilot recommended for the image. Carries
    /// the project id so the frontend can round-trip it back to
    /// `CopilotActionPayload::CreateLabel` (see the `contracts` module) without
    /// extra context.
    #[serde(rename_all = "camelCase")]
    CreateLabel {
        name: String,
        color: String,
        project_id: String,
        message: String,
    },
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CopilotTurnResult {
    pub reply: String,
    pub capability: String,
    pub predictions_added: usize,
    pub findings: Vec<QaFinding>,
    pub proposed_actions: Vec<ProposedAction>,
}

impl CopilotTurnResult {
    /// A text-only reply with no geometry or actions.
    pub fn reply_only(capability: &Capability, reply: impl Into<String>) -> Self {
        Self {
            reply: reply.into(),
            capability: capability.as_str().to_string(),
            predictions_added: 0,
            findings: Vec::new(),
            proposed_actions: Vec::new(),
        }
    }
}

/// Read a string field by its camelCase or snake_case key (annotation/detection
/// JSON carries both spellings).
fn value_string(value: &Value, camel: &str, snake: &str) -> Option<String> {
    value
        .get(camel)
        .or_else(|| value.get(snake))
        .and_then(Value::as_str)
        .map(ToString::to_string)
}

/// Axis-aligned bounding box `[x0, y0, x1, y1]` from a coordinate array entity.
pub fn bbox_from_value(value: &Value) -> Option<[f32; 4]> {
    let coords = value.get("coordinates")?.as_array()?;
    if coords.len() < 2 {
        return None;
    }
    let read = |point: &Value, key: &str| point.get(key).and_then(Value::as_f64).map(|v| v as f32);
    let p0 = coords.first()?;
    let p1 = coords.get(1)?;
    let x0 = read(p0, "x")?;
    let y0 = read(p0, "y")?;
    let x1 = read(p1, "x")?;
    let y1 = read(p1, "y")?;
    Some([x0.min(x1), y0.min(y1), x0.max(x1), y0.max(y1)])
}

fn class_name(value: &Value) -> String {
    value_string(value, "labelName", "label_name")
        .or_else(|| value_string(value, "name", "name"))
        .unwrap_or_default()
}

fn iou(a: [f32; 4], b: [f32; 4]) -> f32 {
    let left = a[0].max(b[0]);
    let top = a[1].max(b[1]);
    let right = a[2].min(b[2]);
    let bottom = a[3].min(b[3]);
    if right <= left || bottom <= top {
        return 0.0;
    }
    let overlap = (right - left) * (bottom - top);
    let area_a = (a[2] - a[0]) * (a[3] - a[1]);
    let area_b = (b[2] - b[0]) * (b[3] - b[1]);
    overlap / (area_a + area_b - overlap).max(f32::EPSILON)
}

/// Compare detector output against the image's existing annotations and produce
/// QA findings + the fixes the user can approve. Pure logic — no model needed
/// beyond the detections passed in.
pub fn qa_findings(
    detections: &[Value],
    annotations: &[Value],
) -> (Vec<QaFinding>, Vec<ProposedAction>) {
    let ann_boxes: Vec<(String, String, [f32; 4])> = annotations
        .iter()
        .filter_map(|annotation| {
            let id = value_string(annotation, "id", "id")?;
            let bbox = bbox_from_value(annotation)?;
            Some((id, class_name(annotation).to_lowercase(), bbox))
        })
        .collect();

    let mut findings: Vec<QaFinding> = Vec::new();
    let mut actions: Vec<ProposedAction> = Vec::new();

    for detection in detections {
        let Some(det_box) = bbox_from_value(detection) else {
            continue;
        };
        let det_name = class_name(detection);

        let mut best_iou = 0.0f32;
        let mut best_idx: Option<usize> = None;
        for (index, (_, _, ann_box)) in ann_boxes.iter().enumerate() {
            let value = iou(det_box, *ann_box);
            if value > best_iou {
                best_iou = value;
                best_idx = Some(index);
            }
        }

        if best_iou < 0.4 {
            if findings.iter().filter(|f| f.kind == "missed").count() < 12 {
                let label = if det_name.is_empty() {
                    "object".to_string()
                } else {
                    det_name.clone()
                };
                findings.push(QaFinding {
                    kind: "missed".into(),
                    message: format!("Possible missed {label}"),
                    annotation_id: None,
                });
            }
        } else if best_iou >= 0.6 {
            if let Some(index) = best_idx {
                let (ann_id, ann_class, _) = &ann_boxes[index];
                let det_lower = det_name.to_lowercase();
                if !det_lower.is_empty() && !ann_class.is_empty() && ann_class != &det_lower {
                    let message =
                        format!("Box labeled \u{201c}{ann_class}\u{201d} looks like \u{201c}{det_lower}\u{201d}");
                    findings.push(QaFinding {
                        kind: "mislabel".into(),
                        message: message.clone(),
                        annotation_id: Some(ann_id.clone()),
                    });
                    actions.push(ProposedAction::Relabel {
                        annotation_id: ann_id.clone(),
                        to_label: det_name.clone(),
                        message,
                    });
                }
            }
        }
    }

    // Near-duplicate existing annotations.
    for i in 0..ann_boxes.len() {
        for j in (i + 1)..ann_boxes.len() {
            if iou(ann_boxes[i].2, ann_boxes[j].2) > 0.9 {
                let dup_id = &ann_boxes[j].0;
                let already = actions.iter().any(|action| {
                    matches!(action, ProposedAction::Delete { annotation_id, .. } if annotation_id == dup_id)
                });
                if !already {
                    let message = "Two near-duplicate boxes overlap".to_string();
                    findings.push(QaFinding {
                        kind: "duplicate".into(),
                        message: message.clone(),
                        annotation_id: Some(dup_id.clone()),
                    });
                    actions.push(ProposedAction::Delete {
                        annotation_id: dup_id.clone(),
                        message,
                    });
                }
            }
        }
    }

    (findings, actions)
}
