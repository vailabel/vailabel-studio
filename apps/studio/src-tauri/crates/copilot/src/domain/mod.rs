//! The pure copilot domain: deterministic intent routing, LLM plan
//! parsing/validation, QA-diff logic, label-suggestion parsing, and the LLM
//! config.
//!
//! The copilot is a thin orchestration layer over the detector and predictions
//! pipeline (the binary's `AiService`). It does **not** do model-driven tool use
//! — small local models can't reliably run a function-calling loop — so a
//! rules-based router (or an optional LLM planner) maps each chat message to a
//! validated [`Plan`] of [`PlanCapability`] steps that Rust executes
//! deterministically. Everything here is pure: no HTTP, no Tauri, no inference
//! engines.

mod config;
mod labels;
mod planning;
mod qa;
mod routing;

pub use config::CopilotLlmConfig;
pub use labels::{parse_label_list, MAX_LABEL_SUGGESTIONS};
pub use planning::{
    parse_plan, planner_user_prompt, route_to_plan, Plan, PlanCapability, PlanStep,
    PLANNER_SYSTEM_PROMPT,
};
pub use qa::{bbox_from_value, qa_findings, CopilotTurnResult, ProposedAction, QaFinding};
pub use routing::{
    disabled_tools_reply, route, tool_enabled, tool_label, Capability, RoutedIntent,
    TOGGLEABLE_TOOLS,
};

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Value};

    fn box_value(id: &str, name: &str, x0: f32, y0: f32, x1: f32, y1: f32) -> Value {
        json!({
            "id": id,
            "name": name,
            "coordinates": [{ "x": x0, "y": y0 }, { "x": x1, "y": y1 }],
        })
    }

    #[test]
    fn tool_gating_respects_the_enabled_set() {
        // None / empty = everything on (back-compat for older clients).
        assert!(tool_enabled("detect", None));
        assert!(tool_enabled("detect", Some(&[])));

        // A non-empty set turns off anything not listed…
        let only_qa = vec!["qa_review".to_string()];
        assert!(tool_enabled("qa_review", Some(&only_qa)));
        assert!(!tool_enabled("detect", Some(&only_qa)));

        // …but help/summarize are always available (not user-toggleable).
        assert!(tool_enabled("help", Some(&only_qa)));
        assert!(tool_enabled("summarize", Some(&only_qa)));

        // Plan steps map to the right tool id for gating.
        assert_eq!(PlanCapability::DetectAll.tool_id(), "detect");
        assert_eq!(PlanCapability::SegmentEachDetection.tool_id(), "segment");
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
