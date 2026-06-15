//! Deterministic, rules-based intent routing.
//!
//! Small local models can't reliably run a function-calling loop, so a
//! keyword router maps each chat message to a single [`Capability`]. This is the
//! fallback whenever the LLM planner (see [`super::planning`]) is absent or
//! returns something unusable.

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

/// Tools the user can switch on/off in the copilot's Tools menu, in display
/// order. `help` and `summarize` are intentionally excluded — they explain or
/// navigate rather than run a model, so they are always available.
pub const TOGGLEABLE_TOOLS: &[&str] = &[
    "suggest_labels",
    "detect",
    "segment",
    "qa_review",
    "describe",
    "ocr",
];

/// Human label for a tool id, for messages back to the user.
pub fn tool_label(tool_id: &str) -> &'static str {
    match tool_id {
        "detect" => "Detect objects",
        "segment" => "Outline / segment",
        "qa_review" => "Check what I missed",
        "suggest_labels" => "Suggest labels",
        "describe" => "Describe image",
        "ocr" => "Read text (OCR)",
        _ => "that tool",
    }
}

/// Whether a tool may run given the user's enabled set. `None`/empty = all on
/// (back-compat for older clients). `help`/`summarize` are always allowed.
pub fn tool_enabled(tool_id: &str, enabled: Option<&[String]>) -> bool {
    if matches!(tool_id, "help" | "summarize") {
        return true;
    }
    match enabled {
        None => true,
        Some(list) if list.is_empty() => true,
        Some(list) => list.iter().any(|entry| entry == tool_id),
    }
}

/// Reply when everything a message routed to is turned off — name the tools that
/// are still on so the user knows what they can ask for.
pub fn disabled_tools_reply(enabled: Option<&[String]>) -> String {
    let on: Vec<&str> = TOGGLEABLE_TOOLS
        .iter()
        .copied()
        .filter(|tool| tool_enabled(tool, enabled))
        .map(tool_label)
        .collect();
    if on.is_empty() {
        "All of my tools are turned off. Open the Tools menu at the top of this panel and switch on \
         the ones you want me to use."
            .to_string()
    } else {
        format!(
            "That tool is turned off. Turn it back on in the Tools menu, or ask me to use one that\u{2019}s \
             on: {}.",
            on.join(", ")
        )
    }
}

#[derive(Debug, Clone)]
pub struct RoutedIntent {
    pub capability: Capability,
    /// Optional class target, e.g. "car" in "label all the cars".
    pub target: Option<String>,
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
