//! Local AI copilot: deterministic intent routing + QA-diff logic.
//!
//! The copilot is a thin orchestration layer over the existing detector and
//! predictions pipeline (see [`super::service::AiService`]). It does **not** do
//! model-driven tool use — small local models can't reliably run a
//! function-calling loop — so a rules-based router maps each chat message to a
//! single [`Capability`], which the service then dispatches.

use serde::Serialize;
use serde_json::Value;

use crate::value_string;

/// What a user message resolved to.
#[derive(Debug, Clone, PartialEq)]
pub enum Capability {
    /// Run the active detector and surface predictions for review.
    Detect,
    /// Detector + diff against existing annotations → findings/fixes.
    Qa,
    /// Vision-language caption (needs Florence-2 — not wired yet).
    Describe,
    /// Text extraction (needs Florence-2 — not wired yet).
    Ocr,
    /// Interactive segmentation (needs SAM — not wired yet).
    Segment,
    /// Recommend label/class names for the current image, drawn from whatever is
    /// available — the local vision model and/or the on-device detector.
    SuggestLabels,
    /// Point the user at Dataset Intelligence.
    Summarize,
    /// Fallback: explain what the copilot can do.
    Help,
}

impl Capability {
    pub fn as_str(&self) -> &'static str {
        match self {
            Capability::Detect => "detect",
            Capability::Qa => "qa_review",
            Capability::Describe => "describe",
            Capability::Ocr => "ocr",
            Capability::Segment => "segment",
            Capability::SuggestLabels => "suggest_labels",
            Capability::Summarize => "summarize",
            Capability::Help => "help",
        }
    }
}

#[derive(Debug, Clone)]
pub struct RoutedIntent {
    pub capability: Capability,
    /// Optional class target, e.g. "car" in "label all the cars".
    pub target: Option<String>,
}

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
    /// [`super::model::CopilotActionPayload::CreateLabel`] without extra context.
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

fn contains_any(haystack: &str, needles: &[&str]) -> bool {
    needles.iter().any(|needle| haystack.contains(needle))
}

/// Map a chat message to a capability. Order matters: strong QA signals
/// ("what did I miss") must win over the weaker "describe"/"detect" verbs.
pub fn route(message: &str, label_names: &[String]) -> RoutedIntent {
    let text = message.to_lowercase();

    let capability = if contains_any(&text, &["ocr", "read text", "read the text", "text in"]) {
        Capability::Ocr
    } else if contains_any(
        &text,
        &["segment", "outline", "mask", "make a polygon", "trace"],
    ) {
        Capability::Segment
    } else if contains_any(
        &text,
        &[
            "suggest label",
            "suggest a label",
            "recommend label",
            "label suggestion",
            "suggest class",
            "recommend class",
            "what label",
            "which label",
            "label names",
            "what should i label",
            "what to label",
            "what classes",
            "which classes",
        ],
    ) {
        Capability::SuggestLabels
    } else if contains_any(
        &text,
        &[
            "miss",
            "missed",
            "missing",
            "mistake",
            "wrong",
            "review",
            "check ",
            "double check",
            "double-check",
            "verify",
            "qa",
            "quality",
            "did i",
            "errors",
            "incorrect",
        ],
    ) {
        Capability::Qa
    } else if contains_any(
        &text,
        &[
            "describe",
            "caption",
            "what is in",
            "what's in",
            "whats in",
            "what do you see",
            "what can you see",
            "explain this image",
        ],
    ) {
        Capability::Describe
    } else if contains_any(
        &text,
        &[
            "detect", "label all", "label the", "find ", "annotate", "identify", "locate",
            "box ", "boxes",
        ],
    ) {
        Capability::Detect
    } else if contains_any(
        &text,
        &[
            "summar",
            "dataset",
            "imbalance",
            "statistic",
            "distribution",
            "class balance",
        ],
    ) {
        Capability::Summarize
    } else {
        Capability::Help
    };

    // Pull a class target out of the message if a project label is named.
    let target = label_names
        .iter()
        .find(|name| {
            let lower = name.to_lowercase();
            !lower.is_empty() && (text.contains(&lower) || text.contains(&format!("{lower}s")))
        })
        .cloned();

    RoutedIntent { capability, target }
}

// ───────────────────────────── LLM orchestration ─────────────────────────────
//
// The local LLM is an *orchestrator*, not a geometry source: it turns a message
// into a small, validated plan of capabilities that Rust executes deterministically
// (e.g. detect → segment-each). It can only ever improve on the keyword router —
// when the LLM is absent or returns garbage, [`route_to_plan`] is the fallback.

/// One capability the orchestrator may schedule. Closed set — anything outside it
/// is dropped during parsing so a hallucinated step can't run.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlanCapability {
    PromptToDetect,
    DetectAll,
    SegmentEachDetection,
    SegmentAtPoints,
    QaReview,
    SuggestLabels,
    Describe,
    Ocr,
    Summarize,
    Help,
}

impl PlanCapability {
    fn parse(value: &str) -> Option<Self> {
        match value.trim().to_lowercase().as_str() {
            "prompt_to_detect" | "prompt_detect" => Some(Self::PromptToDetect),
            "detect_all" | "detect" => Some(Self::DetectAll),
            "segment_each_detection" | "segment_each" => Some(Self::SegmentEachDetection),
            "segment_at_points" | "segment" => Some(Self::SegmentAtPoints),
            "qa_review" | "qa" => Some(Self::QaReview),
            "suggest_labels" | "suggest_label" | "recommend_labels" => Some(Self::SuggestLabels),
            "describe" | "caption" => Some(Self::Describe),
            "ocr" => Some(Self::Ocr),
            "summarize" => Some(Self::Summarize),
            "help" => Some(Self::Help),
            _ => None,
        }
    }

    fn is_detect(&self) -> bool {
        matches!(self, Self::PromptToDetect | Self::DetectAll)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct PlanStep {
    pub capability: PlanCapability,
    /// Optional class target, e.g. "car" for prompt_to_detect.
    pub target: Option<String>,
}

impl PlanStep {
    /// Whether this step produces detection boxes a following segment step can use.
    pub fn is_detect(&self) -> bool {
        self.capability.is_detect()
    }

    /// Map back to a [`RoutedIntent`] so single-step plans reuse the existing
    /// per-capability dispatch unchanged.
    pub fn to_routed_intent(&self) -> RoutedIntent {
        let capability = match self.capability {
            PlanCapability::PromptToDetect | PlanCapability::DetectAll => Capability::Detect,
            PlanCapability::QaReview => Capability::Qa,
            PlanCapability::SegmentAtPoints | PlanCapability::SegmentEachDetection => {
                Capability::Segment
            }
            PlanCapability::SuggestLabels => Capability::SuggestLabels,
            PlanCapability::Describe => Capability::Describe,
            PlanCapability::Ocr => Capability::Ocr,
            PlanCapability::Summarize => Capability::Summarize,
            PlanCapability::Help => Capability::Help,
        };
        RoutedIntent {
            capability,
            target: self.target.clone(),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Plan {
    pub steps: Vec<PlanStep>,
}

/// Max steps honored from an LLM plan (guards against a runaway response).
const MAX_PLAN_STEPS: usize = 4;

/// The orchestrator's system prompt. The model must emit ONLY the plan JSON.
pub const PLANNER_SYSTEM_PROMPT: &str = "You convert a user's image-labeling request \
into a small JSON plan for an offline annotation tool. Respond with ONLY a JSON object \u{2014} \
no prose, no markdown fences.\n\
Schema: {\"steps\":[{\"capability\": one of [prompt_to_detect, detect_all, segment_each_detection, \
segment_at_points, qa_review, suggest_labels, describe, ocr, help], \"target\": optional object class like \"car\"}]}\n\
Rules:\n\
- prompt_to_detect is ONLY for a specific named object class (car, dog, person). Its `target` must \
be that class word \u{2014} never \"object\", \"objects\", \"everything\", or \"all\".\n\
- \"find/label all X\" where X is a specific class \u{2192} prompt_to_detect with target X.\n\
- \"detect objects\"/\"detect all\"/\"detect everything\"/\"label everything\" (no specific class) \
\u{2192} detect_all with NO target.\n\
- if the user also says outline/segment/mask them after detecting \u{2192} add segment_each_detection.\n\
- \"what did I miss\"/\"review\"/\"check\" \u{2192} qa_review.\n\
- \"suggest labels\"/\"recommend labels\"/\"what should I label\"/\"what labels or classes\" \u{2192} suggest_labels (no target).\n\
- \"describe\" \u{2192} describe; \"read text\" \u{2192} ocr; anything else \u{2192} help.\n\
- At most 3 steps. Only use capabilities from the list.\n\
Examples:\n\
\"detect objects\" \u{2192} {\"steps\":[{\"capability\":\"detect_all\"}]}\n\
\"find all cars\" \u{2192} {\"steps\":[{\"capability\":\"prompt_to_detect\",\"target\":\"car\"}]}\n\
\"find all cars and outline them\" \u{2192} {\"steps\":[{\"capability\":\"prompt_to_detect\",\"target\":\"car\"},{\"capability\":\"segment_each_detection\"}]}\n\
\"detect everything\" \u{2192} {\"steps\":[{\"capability\":\"detect_all\"}]}\n\
\"what did I miss\" \u{2192} {\"steps\":[{\"capability\":\"qa_review\"}]}\n\
\"suggest labels for this image\" \u{2192} {\"steps\":[{\"capability\":\"suggest_labels\"}]}";

/// Build the planner's user turn: the message plus a hint of the detector's known
/// classes so it picks valid targets.
pub fn planner_user_prompt(message: &str, vocab: &[String]) -> String {
    let classes: Vec<&str> = vocab
        .iter()
        .map(String::as_str)
        .filter(|name| !name.is_empty())
        .take(40)
        .collect();
    if classes.is_empty() {
        format!("User: {message}")
    } else {
        format!("Known object classes: {}.\nUser: {message}", classes.join(", "))
    }
}

/// Parse an LLM response into a validated [`Plan`]. Tolerates markdown fences and
/// surrounding prose by extracting the first balanced JSON object; drops steps
/// with unknown capabilities. Returns `None` when nothing usable is found, so the
/// caller falls back to the deterministic [`route_to_plan`].
pub fn parse_plan(raw: &str) -> Option<Plan> {
    let json_str = extract_json_object(raw)?;
    let value: Value = serde_json::from_str(json_str).ok()?;
    let steps_value = value.get("steps").and_then(Value::as_array)?;

    let mut steps = Vec::new();
    for step in steps_value.iter().take(MAX_PLAN_STEPS) {
        let Some(capability) = step
            .get("capability")
            .and_then(Value::as_str)
            .and_then(PlanCapability::parse)
        else {
            continue;
        };
        let target = step
            .get("target")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToString::to_string);
        steps.push(PlanStep { capability, target });
    }

    if steps.is_empty() {
        None
    } else {
        Some(Plan { steps })
    }
}

/// The deterministic single-step plan from the keyword router — the fallback when
/// no LLM is available or its output is unusable.
pub fn route_to_plan(message: &str, vocab: &[String]) -> Plan {
    let intent = route(message, vocab);
    let capability = match intent.capability {
        Capability::Detect if intent.target.is_some() => PlanCapability::PromptToDetect,
        Capability::Detect => PlanCapability::DetectAll,
        Capability::Qa => PlanCapability::QaReview,
        Capability::Segment => PlanCapability::SegmentAtPoints,
        Capability::SuggestLabels => PlanCapability::SuggestLabels,
        Capability::Describe => PlanCapability::Describe,
        Capability::Ocr => PlanCapability::Ocr,
        Capability::Summarize => PlanCapability::Summarize,
        Capability::Help => PlanCapability::Help,
    };
    Plan {
        steps: vec![PlanStep {
            capability,
            target: intent.target,
        }],
    }
}

/// Extract the first balanced `{...}` object from arbitrary model output, ignoring
/// braces inside JSON strings. Brace positions are ASCII, so byte slicing is safe.
fn extract_json_object(raw: &str) -> Option<&str> {
    let start = raw.find('{')?;
    let bytes = raw.as_bytes();
    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;
    for i in start..raw.len() {
        let c = bytes[i] as char;
        if in_string {
            if escaped {
                escaped = false;
            } else if c == '\\' {
                escaped = true;
            } else if c == '"' {
                in_string = false;
            }
        } else {
            match c {
                '"' => in_string = true,
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        return Some(&raw[start..=i]);
                    }
                }
                _ => {}
            }
        }
    }
    None
}

/// Max label suggestions kept from a single turn — enough to be useful without
/// burying the user in chips.
pub const MAX_LABEL_SUGGESTIONS: usize = 12;

/// Parse a model's free-text answer into a clean list of candidate label names.
///
/// Tolerates the three shapes a local model tends to return: a JSON array
/// (`["car","person"]`), a comma-separated line, or a newline/bulleted list.
/// Each name is stripped of list markers and quotes, lowercased, and filtered to
/// short noun-like phrases (sentences are dropped); duplicates are removed with
/// order preserved. Pure — unit-tested below.
pub fn parse_label_list(raw: &str) -> Vec<String> {
    let trimmed = raw.trim();
    let tokens: Vec<String> = match extract_json_array(trimmed) {
        Some(array) => array,
        None => trimmed
            .split(|character| matches!(character, ',' | '\n' | ';' | '/'))
            .map(ToString::to_string)
            .collect(),
    };

    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();
    for token in tokens {
        let cleaned = clean_label_token(&token);
        if cleaned.is_empty() {
            continue;
        }
        // Drop sentences/explanations — class names are short noun phrases.
        if cleaned.split_whitespace().count() > 4 || cleaned.chars().count() > 40 {
            continue;
        }
        if seen.insert(cleaned.clone()) {
            out.push(cleaned);
        }
        if out.len() >= MAX_LABEL_SUGGESTIONS {
            break;
        }
    }
    out
}

/// Normalize one candidate token: strip leading list markers (numbering, bullets,
/// dashes), surrounding quotes/brackets, collapse whitespace, and lowercase.
fn clean_label_token(token: &str) -> String {
    let stripped = token
        .trim()
        .trim_start_matches(|character: char| {
            character.is_ascii_digit()
                || matches!(character, '.' | ')' | '(' | '-' | '*' | '•' | '·' | '#' | ' ' | '\t')
        })
        .trim_matches(|character: char| {
            matches!(character, '"' | '\'' | '`' | '[' | ']' | '{' | '}' | '.')
        })
        .trim();
    stripped
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

/// Extract the first `[...]` JSON array of strings from arbitrary model output.
fn extract_json_array(raw: &str) -> Option<Vec<String>> {
    let start = raw.find('[')?;
    let end = raw[start..].find(']').map(|offset| start + offset)?;
    let slice = &raw[start..=end];
    let value: Value = serde_json::from_str(slice).ok()?;
    let array = value.as_array()?;
    Some(
        array
            .iter()
            .filter_map(|entry| entry.as_str().map(ToString::to_string))
            .collect(),
    )
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn box_value(id: &str, name: &str, x0: f32, y0: f32, x1: f32, y1: f32) -> Value {
        json!({
            "id": id,
            "name": name,
            "coordinates": [{ "x": x0, "y": y0 }, { "x": x1, "y": y1 }],
        })
    }

    #[test]
    fn routes_strong_qa_signal_over_detect() {
        assert_eq!(route("check what I missed", &[]).capability, Capability::Qa);
        assert_eq!(route("detect all objects", &[]).capability, Capability::Detect);
        assert_eq!(
            route("describe this image", &[]).capability,
            Capability::Describe
        );
        assert_eq!(route("read the text", &[]).capability, Capability::Ocr);
        assert_eq!(route("hello", &[]).capability, Capability::Help);
    }

    #[test]
    fn routes_label_suggestion_requests() {
        for message in [
            "suggest labels for this image",
            "recommend label names",
            "what labels should I use here",
            "what classes are in this image",
        ] {
            assert_eq!(
                route(message, &[]).capability,
                Capability::SuggestLabels,
                "should route to SuggestLabels: {message:?}"
            );
        }
        // "review my labels" is a QA ask, not a suggestion.
        assert_eq!(route("review my labels", &[]).capability, Capability::Qa);
    }

    #[test]
    fn parses_label_list_from_csv_json_and_bullets() {
        // Comma-separated with stray casing/spacing.
        assert_eq!(
            parse_label_list(" Car, Person ,traffic light"),
            vec!["car", "person", "traffic light"]
        );
        // JSON array embedded in prose.
        assert_eq!(
            parse_label_list("Sure! [\"dog\", \"Cat\", \"dog\"] are visible."),
            vec!["dog", "cat"]
        );
        // Numbered / bulleted list, deduped, sentences dropped.
        let raw = "1. bicycle\n2. Bicycle\n- bus\n* This image clearly shows a crowded street scene with many things";
        assert_eq!(parse_label_list(raw), vec!["bicycle", "bus"]);
        // Nothing usable.
        assert!(parse_label_list("I can't tell.").len() <= 1);
    }

    #[test]
    fn extracts_class_target_from_labels() {
        let labels = vec!["car".to_string(), "person".to_string()];
        let intent = route("label all the cars", &labels);
        assert_eq!(intent.capability, Capability::Detect);
        assert_eq!(intent.target.as_deref(), Some("car"));
    }

    #[test]
    fn qa_flags_missed_and_mislabel() {
        let detections = vec![
            box_value("d1", "car", 10.0, 10.0, 50.0, 50.0),
            box_value("d2", "person", 100.0, 100.0, 140.0, 160.0),
        ];
        let annotations = vec![box_value("a1", "dog", 100.0, 100.0, 140.0, 160.0)];

        let (findings, actions) = qa_findings(&detections, &annotations);

        assert!(findings.iter().any(|f| f.kind == "missed"));
        assert!(actions.iter().any(|action| matches!(
            action,
            ProposedAction::Relabel { to_label, .. } if to_label == "person"
        )));
    }

    #[test]
    fn parses_a_chained_detect_segment_plan() {
        let plan = parse_plan(
            r#"{"steps":[{"capability":"prompt_to_detect","target":"car"},{"capability":"segment_each_detection"}]}"#,
        )
        .expect("plan should parse");
        assert_eq!(plan.steps.len(), 2);
        assert_eq!(plan.steps[0].capability, PlanCapability::PromptToDetect);
        assert_eq!(plan.steps[0].target.as_deref(), Some("car"));
        assert!(plan.steps[0].is_detect());
        assert_eq!(plan.steps[1].capability, PlanCapability::SegmentEachDetection);
    }

    #[test]
    fn parses_plan_wrapped_in_fences_and_prose() {
        let raw = "Sure! Here is the plan:\n```json\n{\"steps\":[{\"capability\":\"detect_all\"}]}\n```\nHope that helps.";
        let plan = parse_plan(raw).expect("plan should parse out of fences");
        assert_eq!(plan.steps.len(), 1);
        assert_eq!(plan.steps[0].capability, PlanCapability::DetectAll);
    }

    #[test]
    fn drops_unknown_capabilities_and_rejects_empty_or_garbage() {
        // Unknown capability is dropped; the one valid step survives.
        let plan = parse_plan(
            r#"{"steps":[{"capability":"teleport"},{"capability":"qa_review"}]}"#,
        )
        .expect("one valid step remains");
        assert_eq!(plan.steps.len(), 1);
        assert_eq!(plan.steps[0].capability, PlanCapability::QaReview);

        // All-unknown → None (caller falls back to the keyword router).
        assert!(parse_plan(r#"{"steps":[{"capability":"teleport"}]}"#).is_none());
        // Non-JSON / no object → None.
        assert!(parse_plan("I cannot help with that.").is_none());
        assert!(parse_plan("").is_none());
    }

    #[test]
    fn route_to_plan_is_a_single_step_fallback() {
        let labels = vec!["car".to_string()];
        let plan = route_to_plan("find all cars", &labels);
        assert_eq!(plan.steps.len(), 1);
        assert_eq!(plan.steps[0].capability, PlanCapability::PromptToDetect);
        assert_eq!(plan.steps[0].target.as_deref(), Some("car"));

        let plan = route_to_plan("detect everything", &[]);
        assert_eq!(plan.steps[0].capability, PlanCapability::DetectAll);
    }

    #[test]
    fn qa_flags_duplicate_boxes() {
        let detections: Vec<Value> = Vec::new();
        let annotations = vec![
            box_value("a1", "car", 10.0, 10.0, 100.0, 100.0),
            box_value("a2", "car", 11.0, 11.0, 101.0, 101.0),
        ];

        let (_findings, actions) = qa_findings(&detections, &annotations);

        assert!(actions.iter().any(|action| matches!(
            action,
            ProposedAction::Delete { annotation_id, .. } if annotation_id == "a2"
        )));
    }
}
