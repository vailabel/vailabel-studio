//! LLM-driven plan orchestration.
//!
//! The local LLM is an *orchestrator*, not a geometry source: it turns a message
//! into a small, validated plan of capabilities that Rust executes
//! deterministically (e.g. detect → segment-each). It can only ever improve on
//! the keyword router — when the LLM is absent or returns garbage,
//! [`route_to_plan`] is the fallback.

use serde_json::Value;

use super::routing::{route, Capability, RoutedIntent};

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

    /// The toggleable tool id this step belongs to (for enable/disable gating).
    pub fn tool_id(&self) -> &'static str {
        match self {
            Self::PromptToDetect | Self::DetectAll => "detect",
            Self::SegmentEachDetection | Self::SegmentAtPoints => "segment",
            Self::QaReview => "qa_review",
            Self::SuggestLabels => "suggest_labels",
            Self::Describe => "describe",
            Self::Ocr => "ocr",
            Self::Summarize => "summarize",
            Self::Help => "help",
        }
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
