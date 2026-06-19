//! The copilot use-case service.
//!
//! `CopilotAppService` transcribes the pre-refactor `AiService` copilot
//! orchestration — turn → plan → dispatch/execute → the per-capability handlers
//! + `test_connection` — depending only on the two ports
//! ([`CopilotLlm`]/[`CopilotInference`]) and the pure [`crate::domain`] logic.
//! It carries no HTTP/Tauri/inference knowledge; those live behind the ports,
//! implemented at the composition root.

use std::collections::HashSet;
use std::sync::Arc;

use serde_json::Value;
use vailabel_core::{DomainError, DomainResult};

use crate::application::ports::{BoxPrompt, CopilotInference, CopilotLlm};
use crate::contracts::{CopilotTestPayload, CopilotTestResult, CopilotTurnPayload};
use crate::domain::{self, Capability, CopilotLlmConfig, CopilotTurnResult, ProposedAction};

const DEFAULT_AI_LABEL_COLOR: &str = "#22c55e";

const COPILOT_SYSTEM_PROMPT: &str = "You are the AI labeling copilot inside VaiLabel Studio, an \
image annotation tool that runs entirely on the user's machine. When an image is provided, look at \
it and answer concisely and concretely to help the user label it \u{2014} objects present, their \
attributes, and any readable text. You cannot draw boxes yourself: if the user wants annotations \
created, tell them to ask you to \u{201c}detect objects\u{201d} or \u{201c}check what I missed\u{201d}, \
which run the local detector. Keep answers short and practical.";

/// System prompt for *narration* — rephrasing a deterministic status line, not
/// chatting. Constrained so weak local models don't add greetings/preambles
/// (e.g. "Okay, I'm ready. Let's begin!") or invent objects/actions.
const NARRATION_SYSTEM_PROMPT: &str = "You rewrite one short status line from an image \
labeling tool into plain language for the user. Output ONLY the rewritten status as one or two \
sentences \u{2014} no greeting, no preamble, no \u{201c}Okay\u{201d}/\u{201c}Sure\u{201d}/\u{201c}Let's \
begin\u{201d}, no markdown, no follow-up question. State only what the status says; never invent \
objects, counts, or that boxes exist when the status says none were found.";

/// System prompt for the vision model when recommending label names. Constrained
/// so weak local VLMs return a clean class list, not a description.
const LABEL_SUGGEST_SYSTEM_PROMPT: &str = "You help a user set up an image-annotation project. \
Look at the image and list the distinct object categories worth labeling with bounding boxes. \
Reply with ONLY a comma-separated list of short, lowercase, singular class names (for example: \
car, person, traffic light, dog). No numbers, no counts, no descriptions, no markdown \u{2014} \
just the list. Give between 3 and 12 of the most useful, concrete categories.";
const LABEL_SUGGEST_USER_PROMPT: &str = "What object categories should I label in this image?";

/// Cap on detections auto-segmented in a chained detect → segment-each turn, so a
/// crowded image can't fan out into hundreds of decoder runs.
const MAX_SEGMENT_FANOUT: usize = 20;

/// Orchestrates a copilot chat turn over the LLM + inference ports. Depends only
/// on those ports (injected at the composition root), so it is pure.
pub struct CopilotAppService {
    llm: Arc<dyn CopilotLlm>,
    inference: Arc<dyn CopilotInference>,
}

impl CopilotAppService {
    pub fn new(llm: Arc<dyn CopilotLlm>, inference: Arc<dyn CopilotInference>) -> Self {
        Self { llm, inference }
    }

    /// Validate a manual copilot server config (Settings → AI Copilot) by probing
    /// its `/models`. Reports the reachable models, or a clear error. A typed key
    /// in the payload is used when present, else the saved keychain key.
    pub fn test_connection(&self, payload: CopilotTestPayload) -> CopilotTestResult {
        match self
            .llm
            .test_connection(&payload.base_url, payload.api_key.as_deref())
        {
            Ok(models) => {
                // A successful test means the config is usable now; drop the cache
                // so the next turn picks it up instead of waiting out the TTL.
                self.llm.invalidate();
                let count = models.len();
                CopilotTestResult {
                    ok: true,
                    message: format!(
                        "Connected \u{2014} {count} model{} available.",
                        if count == 1 { "" } else { "s" }
                    ),
                    models,
                }
            }
            Err(message) => CopilotTestResult {
                ok: false,
                message,
                models: Vec::new(),
            },
        }
    }

    /// One copilot chat turn: route the message to a capability and dispatch.
    pub fn turn(&self, payload: CopilotTurnPayload) -> DomainResult<CopilotTurnResult> {
        let image = self
            .inference
            .image(&payload.item_id)?
            .ok_or_else(|| DomainError::not_found("Image"))?;
        let project_id = payload
            .project_id
            .clone()
            .filter(|value| !value.is_empty())
            .or_else(|| value_string(&image, "projectId", "project_id"))
            .unwrap_or_default();
        let labels = if project_id.is_empty() {
            Vec::new()
        } else {
            self.inference.project_labels(&project_id)?
        };
        let label_names: Vec<String> = labels
            .iter()
            .filter_map(|label| value_string(label, "name", "name"))
            .collect();

        // Route against project labels *and* the active detector's class names, so
        // "find all cars" extracts the "car" target even before the project has a
        // matching label (closed-vocab COCO or an open-vocab model's vocabulary).
        let mut vocab = label_names.clone();
        vocab.extend(self.inference.detector_class_names());
        // The copilot auto-discovers a local LLM/VLM and picks the model itself.
        let llm = self.llm.resolve();
        let llm = llm.as_ref();

        // Orchestrate: the local LLM turns the message into a validated plan (which
        // may chain steps, e.g. detect → segment-each). When the LLM is absent or
        // its output is unusable, fall back to the deterministic keyword router, so
        // the orchestrator can only ever improve on today's behavior.
        let mut plan = self
            .plan_message(&payload.message, &vocab, llm)
            .unwrap_or_else(|| domain::route_to_plan(&payload.message, &vocab));

        // Honor the user's Tools menu: drop any planned step for a tool they
        // turned off, so a disabled tool never runs even if the message asks.
        let enabled = payload.enabled_tools.as_deref();
        plan.steps
            .retain(|step| domain::tool_enabled(step.capability.tool_id(), enabled));

        if plan.steps.is_empty() {
            // Everything this message routed to is off — re-route once to name the
            // intended tool, and either run it (if it's actually on) or explain.
            let intent = domain::route(&payload.message, &vocab);
            if domain::tool_enabled(intent.capability.as_str(), enabled) {
                return self.dispatch_intent(&intent, &image, &payload.item_id, &payload.message, llm);
            }
            return Ok(CopilotTurnResult::reply_only(
                &Capability::Help,
                domain::disabled_tools_reply(enabled),
            ));
        }

        if plan.steps.len() == 1 {
            // Single step → reuse the existing per-capability dispatch unchanged.
            let intent = plan.steps[0].to_routed_intent();
            return self.dispatch_intent(&intent, &image, &payload.item_id, &payload.message, llm);
        }

        self.execute_plan(&plan, &image, &payload.item_id, &payload.message, llm)
    }

    /// Ask the local LLM to plan the turn as validated steps. Returns `None` when
    /// no LLM is configured/reachable or its output isn't a usable plan, so the
    /// caller falls back to deterministic routing.
    fn plan_message(
        &self,
        message: &str,
        vocab: &[String],
        llm: Option<&CopilotLlmConfig>,
    ) -> Option<domain::Plan> {
        let config = llm?;
        let user = domain::planner_user_prompt(message, vocab);
        let raw = match self.llm.chat_json(config, domain::PLANNER_SYSTEM_PROMPT, &user) {
            Ok(text) => text,
            Err(_) => {
                if !self.llm.server_reachable(&config.base_url) {
                    self.llm.invalidate();
                }
                return None;
            }
        };
        domain::parse_plan(&raw)
    }

    /// Dispatch one routed capability to its handler (the deterministic per-turn
    /// path, shared by single-step plans and the multi-step executor).
    fn dispatch_intent(
        &self,
        intent: &domain::RoutedIntent,
        image: &Value,
        item_id: &str,
        message: &str,
        llm: Option<&CopilotLlmConfig>,
    ) -> DomainResult<CopilotTurnResult> {
        match intent.capability {
            // Grounding stays deterministic — the detector, never the LLM.
            Capability::Detect => self.copilot_detect(intent, item_id, llm),
            Capability::Qa => self.copilot_qa(intent, item_id, llm),
            // Label-name recommendation: gather names from the vision model and/or
            // the detector and offer them as one-click "add label" actions.
            Capability::SuggestLabels => self.copilot_suggest_labels(intent, image, item_id, llm),
            Capability::Segment => Ok(CopilotTurnResult::reply_only(
                &intent.capability,
                "Click an object (or draw a box) on the canvas and I\u{2019}ll outline it with \
                 SAM. To outline detections in one go, ask me to \u{201c}find all cars and outline \
                 them\u{201d}.",
            )),
            Capability::Summarize => Ok(CopilotTurnResult::reply_only(
                &intent.capability,
                "Open the Dataset Intelligence page to run a full dataset analysis \u{2014} class \
                 balance, image counts, and quality checks.",
            )),
            // Conversational + vision: route to the local LLM when configured,
            // otherwise point the user at the detector / model settings.
            Capability::Describe | Capability::Ocr | Capability::Help => match llm {
                Some(config) if config.vision || matches!(intent.capability, Capability::Help) => {
                    self.copilot_chat(intent, image, message, config)
                }
                // A local model is up but can't see images: don't let a text-only
                // model hallucinate a description/OCR — ask for a vision model.
                Some(_) => Ok(CopilotTurnResult::reply_only(
                    &intent.capability,
                    "I found a local model, but I don\u{2019}t think it can see images. If it \
                     actually is a vision model, set Vision to \u{201c}Always send the image\u{201d} \
                     in Settings \u{2192} AI Copilot and ask again. Otherwise load a vision model \
                     (look for a \u{201c}-VL\u{201d}, LLaVA, or Moondream model in LM Studio or \
                     Ollama). For now I can still run the detector \u{2014} try \u{201c}detect \
                     objects\u{201d} or \u{201c}check what I missed\u{201d}.",
                )),
                None => Ok(CopilotTurnResult::reply_only(
                    &intent.capability,
                    match &intent.capability {
                        Capability::Help => "I can label this image with your local detector \u{2014} \
                            try \u{201c}detect objects\u{201d}, \u{201c}find all cars\u{201d}, or \
                            \u{201c}check what I missed\u{201d}. To describe images, read text, or \
                            chat, start a local model server (LM Studio, Ollama, or llama.cpp) and \
                            I\u{2019}ll pick it up automatically.",
                        _ => "Describing images and reading text needs a local vision model. Start a \
                            local model server (LM Studio, Ollama, or llama.cpp) and I\u{2019}ll use \
                            it automatically \u{2014} or run your detector now with \u{201c}detect \
                            objects\u{201d} or \u{201c}check what I missed\u{201d}.",
                    },
                )),
            },
        }
    }

    /// Run a multi-step plan, chaining detect → segment-each (boxes from the detect
    /// step feed SAM). Accumulates predictions, findings and actions into one
    /// result; other capabilities reuse [`Self::dispatch_intent`].
    fn execute_plan(
        &self,
        plan: &domain::Plan,
        image: &Value,
        item_id: &str,
        message: &str,
        llm: Option<&CopilotLlmConfig>,
    ) -> DomainResult<CopilotTurnResult> {
        let mut predictions_added = 0usize;
        let mut findings = Vec::new();
        let mut proposed_actions = Vec::new();
        let mut reply_parts: Vec<String> = Vec::new();
        let mut last_detection_target: Option<String> = None;

        for step in &plan.steps {
            if matches!(step.capability, domain::PlanCapability::SegmentEachDetection) {
                let boxes = self.detection_boxes(item_id)?;
                if boxes.is_empty() {
                    reply_parts.push("There were no detections to outline.".into());
                    continue;
                }
                match self
                    .inference
                    .segment_boxes(item_id, boxes, last_detection_target.as_deref())
                {
                    Ok(polygons) => {
                        predictions_added += polygons.len();
                        reply_parts
                            .push(format!("Outlined {} detection(s) as polygons.", polygons.len()));
                    }
                    Err(error) => {
                        reply_parts.push(format!("I couldn't outline the detections: {error}"))
                    }
                }
                continue;
            }

            let intent = step.to_routed_intent();
            if step.is_detect() {
                last_detection_target = intent.target.clone();
            }
            let result = self.dispatch_intent(&intent, image, item_id, message, llm)?;
            predictions_added += result.predictions_added;
            findings.extend(result.findings);
            proposed_actions.extend(result.proposed_actions);
            if !result.reply.trim().is_empty() {
                reply_parts.push(result.reply);
            }
        }

        Ok(CopilotTurnResult {
            reply: if reply_parts.is_empty() {
                "Done.".to_string()
            } else {
                reply_parts.join(" ")
            },
            capability: "plan".to_string(),
            predictions_added,
            findings,
            proposed_actions,
        })
    }

    /// The image's current detection boxes (highest-confidence first, capped), for
    /// feeding a segment-each step. Polygons are skipped.
    fn detection_boxes(&self, item_id: &str) -> DomainResult<Vec<BoxPrompt>> {
        let predictions = self.inference.predictions(item_id)?;
        let mut scored: Vec<(f32, BoxPrompt)> = predictions
            .iter()
            .filter(|prediction| {
                value_string(prediction, "type", "type").as_deref() != Some("polygon")
            })
            .filter_map(|prediction| {
                let bbox = domain::bbox_from_value(prediction)?;
                let confidence = prediction
                    .get("confidence")
                    .and_then(Value::as_f64)
                    .unwrap_or(0.0) as f32;
                Some((
                    confidence,
                    BoxPrompt {
                        x1: bbox[0],
                        y1: bbox[1],
                        x2: bbox[2],
                        y2: bbox[3],
                    },
                ))
            })
            .collect();
        scored.sort_by(|a, b| b.0.total_cmp(&a.0));
        Ok(scored
            .into_iter()
            .take(MAX_SEGMENT_FANOUT)
            .map(|(_, bbox)| bbox)
            .collect())
    }

    /// Conversational/vision reply via the configured local LLM. Includes the
    /// current image as a vision part when the model supports it.
    fn copilot_chat(
        &self,
        intent: &domain::RoutedIntent,
        image: &Value,
        message: &str,
        config: &CopilotLlmConfig,
    ) -> DomainResult<CopilotTurnResult> {
        let image_url = if config.vision {
            value_string(image, "path", "path").and_then(|path| self.llm.image_data_url(&path))
        } else {
            None
        };

        // A failed LLM call is surfaced as the reply text, not a hard error, so
        // the chat keeps working when the local server is down or misconfigured.
        let reply = match self
            .llm
            .chat(config, COPILOT_SYSTEM_PROMPT, message, image_url.as_deref())
        {
            Ok(text) => text,
            Err(error) => {
                // Only forget the server if it's actually gone; an HTTP or content
                // error from a healthy server shouldn't force a re-discovery sweep.
                if !self.llm.server_reachable(&config.base_url) {
                    self.llm.invalidate();
                }
                error
            }
        };
        Ok(CopilotTurnResult::reply_only(&intent.capability, reply))
    }

    fn copilot_detect(
        &self,
        intent: &domain::RoutedIntent,
        item_id: &str,
        llm: Option<&CopilotLlmConfig>,
    ) -> DomainResult<CopilotTurnResult> {
        let model_id = match self.inference.detector_model_id()? {
            Some(id) => id,
            None => {
                return Ok(CopilotTurnResult::reply_only(
                    &intent.capability,
                    "I don't have a detection model to use yet. Open the AI Models page and import \
                     or install one (e.g. a YOLO model), then ask me to detect again.",
                ))
            }
        };

        // A *specific* class narrows the detector ("find all cars" → cars only);
        // a generic word ("detect objects", "everything") must NOT filter — the
        // orchestrator sometimes emits target "object(s)", which matches no real
        // class and would otherwise drop every detection to zero.
        let effective_target = intent
            .target
            .as_deref()
            .map(str::trim)
            .filter(|target| !target.is_empty() && !is_generic_detect_target(target));

        let predictions = match self.inference.detect(item_id, &model_id, effective_target) {
            Ok(predictions) => predictions,
            Err(error) => {
                return Ok(CopilotTurnResult::reply_only(
                    &intent.capability,
                    format!("I couldn't run the detector: {error}"),
                ))
            }
        };

        let count = predictions.len();
        if count == 0 {
            // Don't narrate the empty case: a weak local model tends to hallucinate
            // "boxes are on the canvas" even when nothing was found. Return a clear,
            // deterministic message instead.
            let reply = match effective_target {
                Some(target) => format!(
                    "I didn't find any \u{201c}{target}\u{201d} above the confidence threshold on \
                     this image."
                ),
                None => "I didn't find any objects above the confidence threshold. This detector \
                         recognizes the 80 common COCO classes (people, vehicles, animals, everyday \
                         objects) \u{2014} try an image with those, or a different model."
                    .to_string(),
            };
            return Ok(CopilotTurnResult {
                reply,
                capability: intent.capability.as_str().to_string(),
                predictions_added: 0,
                findings: Vec::new(),
                proposed_actions: Vec::new(),
            });
        }

        let summary = summarize_by_class(&predictions);
        let fallback = format!(
            "Detected {count} object(s) ({summary}). They're on the canvas as predictions \u{2014} \
             accept the ones you want to keep."
        );
        // YOLO did the detection; let the copilot model phrase the (non-empty) result.
        let instruction = format!(
            "The local detector found {count} objects on the image: {summary}. They are now on the \
             canvas as predictions to accept or reject. Rewrite that as one short sentence. Do not \
             invent objects beyond this list."
        );
        let reply = self.narrate(llm, &instruction, fallback);

        Ok(CopilotTurnResult {
            reply,
            capability: intent.capability.as_str().to_string(),
            predictions_added: count,
            findings: Vec::new(),
            proposed_actions: Vec::new(),
        })
    }

    fn copilot_qa(
        &self,
        intent: &domain::RoutedIntent,
        item_id: &str,
        llm: Option<&CopilotLlmConfig>,
    ) -> DomainResult<CopilotTurnResult> {
        let model_id = match self.inference.detector_model_id()? {
            Some(id) => id,
            None => {
                return Ok(CopilotTurnResult::reply_only(
                    &intent.capability,
                    "QA review compares your annotations against the detector, but I don't have a \
                     model yet. Import or install one on the AI Models page first.",
                ))
            }
        };

        let detections = match self.inference.detect(item_id, &model_id, None) {
            Ok(predictions) => predictions,
            Err(error) => {
                return Ok(CopilotTurnResult::reply_only(
                    &intent.capability,
                    format!("I couldn't run the detector for QA: {error}"),
                ))
            }
        };

        let annotations = self.inference.annotations(item_id)?;
        let (findings, proposed_actions) = domain::qa_findings(&detections, &annotations);

        let missed = findings.iter().filter(|f| f.kind == "missed").count();
        let mislabels = proposed_actions
            .iter()
            .filter(|a| matches!(a, ProposedAction::Relabel { .. }))
            .count();
        let duplicates = proposed_actions
            .iter()
            .filter(|a| matches!(a, ProposedAction::Delete { .. }))
            .count();

        let fallback = if findings.is_empty() {
            "Looks good \u{2014} the detector didn't surface any missed objects, mislabels, or \
             duplicate boxes on this image."
                .to_string()
        } else {
            format!(
                "QA review: {missed} possible missed object(s) (added as predictions to review), \
                 {mislabels} possible mislabel(s), and {duplicates} near-duplicate box(es). \
                 Approve the fixes you agree with below."
            )
        };
        // The detector + diff produced the findings; the copilot model phrases them.
        let instruction = format!(
            "A QA pass compared the local detector against the user's existing labels on this \
             image. Findings: {missed} possible missed objects (added as predictions), {mislabels} \
             possible mislabels, {duplicates} near-duplicate boxes. In one or two short sentences, \
             summarize this for the user and, if there are any fixes, tell them to approve the \
             suggested fixes shown below. If everything is zero, reassure them it looks good."
        );
        let reply = self.narrate(llm, &instruction, fallback);

        Ok(CopilotTurnResult {
            reply,
            capability: intent.capability.as_str().to_string(),
            predictions_added: detections.len(),
            findings,
            proposed_actions,
        })
    }

    /// Recommend label/class names for the current image, drawn from whatever is
    /// available — the auto-discovered local vision model and/or the on-device
    /// detector — merged, deduped, and filtered against the project's existing
    /// labels. Each suggestion is returned as a `CreateLabel` action the user can
    /// add with one click. Both sources stay on the user's machine.
    fn copilot_suggest_labels(
        &self,
        intent: &domain::RoutedIntent,
        image: &Value,
        item_id: &str,
        llm: Option<&CopilotLlmConfig>,
    ) -> DomainResult<CopilotTurnResult> {
        let project_id = value_string(image, "projectId", "project_id").unwrap_or_default();
        let existing_labels = if project_id.is_empty() {
            Vec::new()
        } else {
            self.inference.project_labels(&project_id)?
        };
        let existing_lower: HashSet<String> = existing_labels
            .iter()
            .filter_map(|label| value_string(label, "name", "name"))
            .map(|name| name.trim().to_lowercase())
            .collect();

        let mut suggestions: Vec<String> = Vec::new();
        let mut sources: Vec<&str> = Vec::new();
        let mut notes: Vec<String> = Vec::new();
        let mut predictions_added = 0usize;

        // 1) Vision model: ask it to name the object classes it sees.
        let vision_available = matches!(llm, Some(config) if config.vision);
        if let Some(config) = llm {
            if config.vision {
                match self.vlm_suggest_labels(image, config) {
                    Ok(mut names) if !names.is_empty() => {
                        sources.push("the vision model");
                        suggestions.append(&mut names);
                    }
                    Ok(_) => {}
                    Err(_) => {
                        // A failed call shouldn't sink the whole turn — the
                        // detector may still produce names. Re-discover only if
                        // the server is actually gone.
                        if !self.llm.server_reachable(&config.base_url) {
                            self.llm.invalidate();
                        }
                    }
                }
            }
        }

        // 2) Detector: run it (best-effort) and use the classes it found on THIS
        //    image. This also surfaces boxes on the canvas to accept.
        let detector_model_id = self.inference.detector_model_id().ok().flatten();
        let detector_available = detector_model_id.is_some();
        if let Some(model_id) = detector_model_id {
            match self.inference.detect(item_id, &model_id, None) {
                Ok(predictions) => {
                    predictions_added = predictions.len();
                    let mut names: Vec<String> = predictions
                        .iter()
                        .filter_map(|prediction| {
                            value_string(prediction, "labelName", "label_name")
                                .or_else(|| value_string(prediction, "name", "name"))
                        })
                        .map(|name| name.trim().to_lowercase())
                        .filter(|name| !name.is_empty())
                        .collect();
                    if !names.is_empty() {
                        sources.push("the detector");
                    }
                    suggestions.append(&mut names);
                }
                Err(error) => notes.push(format!("The detector couldn\u{2019}t run ({error}).")),
            }
        }

        // Neither source is set up → tell the user how to enable one.
        if !vision_available && !detector_available {
            return Ok(CopilotTurnResult::reply_only(
                &intent.capability,
                "To suggest label names from this image I need either a local vision model \
                 (start LM Studio, Ollama, or llama.cpp with a \u{201c}-VL\u{201d}/LLaVA/Moondream \
                 model) or an installed detector (add a YOLO model on the AI Models page). Set up \
                 either one and ask again \u{2014} both stay on your machine.",
            ));
        }

        // Dedupe (case-insensitive, order-preserving) and drop names the project
        // already has a label for.
        let mut seen = HashSet::new();
        let mut fresh: Vec<String> = Vec::new();
        let mut already_have = 0usize;
        for name in suggestions {
            let key = name.trim().to_lowercase();
            if key.is_empty() || !seen.insert(key.clone()) {
                continue;
            }
            if existing_lower.contains(&key) {
                already_have += 1;
                continue;
            }
            fresh.push(key);
        }
        fresh.truncate(domain::MAX_LABEL_SUGGESTIONS);

        let proposed_actions: Vec<ProposedAction> = fresh
            .iter()
            .map(|name| ProposedAction::CreateLabel {
                name: name.clone(),
                color: DEFAULT_AI_LABEL_COLOR.to_string(),
                project_id: project_id.clone(),
                message: format!("Add \u{201c}{name}\u{201d} as a label"),
            })
            .collect();

        let reply = build_suggest_reply(&fresh, &sources, already_have, &notes);

        Ok(CopilotTurnResult {
            reply,
            capability: intent.capability.as_str().to_string(),
            predictions_added,
            findings: Vec::new(),
            proposed_actions,
        })
    }

    /// Ask the configured local vision model to name the object categories in the
    /// image, returning a cleaned list of candidate label names.
    fn vlm_suggest_labels(
        &self,
        image: &Value,
        config: &CopilotLlmConfig,
    ) -> Result<Vec<String>, String> {
        let image_url = value_string(image, "path", "path")
            .and_then(|path| self.llm.image_data_url(&path))
            .ok_or_else(|| "Image file is unavailable for the vision model".to_string())?;
        let raw = self.llm.chat(
            config,
            LABEL_SUGGEST_SYSTEM_PROMPT,
            LABEL_SUGGEST_USER_PROMPT,
            Some(&image_url),
        )?;
        Ok(domain::parse_label_list(&raw))
    }

    /// Rephrase a deterministic detector result through the local LLM so the
    /// copilot "responds" conversationally. The detection itself is always YOLO;
    /// the LLM only narrates. Falls back to `fallback` if no LLM is configured or
    /// the call fails.
    fn narrate(
        &self,
        llm: Option<&CopilotLlmConfig>,
        instruction: &str,
        fallback: String,
    ) -> String {
        let Some(config) = llm else {
            return fallback;
        };
        match self
            .llm
            .chat(config, NARRATION_SYSTEM_PROMPT, instruction, None)
        {
            Ok(text) => text,
            Err(_) => {
                if !self.llm.server_reachable(&config.base_url) {
                    self.llm.invalidate();
                }
                fallback
            }
        }
    }
}

/// Read a string field by its camelCase or snake_case key.
fn value_string(value: &Value, camel: &str, snake: &str) -> Option<String> {
    value
        .get(camel)
        .or_else(|| value.get(snake))
        .and_then(Value::as_str)
        .map(ToString::to_string)
}

/// Whether a detection target word is a generic placeholder ("object", "all", …)
/// that must NOT filter the detector to a single class.
fn is_generic_detect_target(target: &str) -> bool {
    const GENERIC: &[&str] = &[
        "object", "objects", "thing", "things", "item", "items", "stuff", "everything", "anything",
        "something", "all", "any", "every", "the", "a", "an",
    ];
    let trimmed = target.trim().to_lowercase();
    if trimmed.is_empty() {
        return true;
    }
    trimmed.split_whitespace().all(|word| GENERIC.contains(&word))
}

fn summarize_by_class(predictions: &[Value]) -> String {
    use std::collections::BTreeMap;

    let mut counts: BTreeMap<String, usize> = BTreeMap::new();
    for prediction in predictions {
        let name = value_string(prediction, "labelName", "label_name")
            .or_else(|| value_string(prediction, "name", "name"))
            .unwrap_or_else(|| "object".to_string());
        *counts.entry(name).or_insert(0) += 1;
    }

    counts
        .into_iter()
        .take(6)
        .map(|(name, count)| format!("{count} {name}"))
        .collect::<Vec<_>>()
        .join(", ")
}

/// Compose the copilot's reply for a label-suggestion turn from the fresh names,
/// which sources produced them, how many were already covered, and any notes.
fn build_suggest_reply(
    fresh: &[String],
    sources: &[&str],
    already_have: usize,
    notes: &[String],
) -> String {
    let mut parts: Vec<String> = Vec::new();
    if fresh.is_empty() {
        if already_have > 0 {
            parts.push(format!(
                "Your project already has labels for everything I recognized here ({already_have} \
                 match{}).",
                if already_have == 1 { "" } else { "es" }
            ));
        } else {
            parts.push(
                "I couldn\u{2019}t pick out clear object categories to label in this image.".into(),
            );
        }
    } else {
        let source_text = if sources.is_empty() {
            String::new()
        } else {
            format!(" (from {})", join_human(sources))
        };
        parts.push(format!(
            "Here are label names I\u{2019}d suggest for this image{source_text} \u{2014} tap one to \
             add it to your project:"
        ));
        if already_have > 0 {
            parts.push(format!(
                "({already_have} more match labels you already have.)"
            ));
        }
    }
    parts.extend(notes.iter().cloned());
    parts.join(" ")
}

/// Join a short list into "a", "a and b", or "a, b and c".
fn join_human(items: &[&str]) -> String {
    match items {
        [] => String::new(),
        [one] => (*one).to_string(),
        [first, second] => format!("{first} and {second}"),
        _ => {
            let (last, rest) = items.split_last().expect("non-empty");
            format!("{} and {}", rest.join(", "), last)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::ports::{BoxPrompt, CopilotInference, CopilotLlm};
    use serde_json::json;
    use std::sync::Mutex;

    /// A scripted LLM port: no server by default (forces deterministic routing +
    /// fallback replies). `invalidated` records whether the cache was dropped.
    #[derive(Default)]
    struct FakeLlm {
        config: Option<CopilotLlmConfig>,
        chat_reply: Option<String>,
        chat_json_reply: Option<String>,
        reachable: bool,
        test_result: Option<Result<Vec<String>, String>>,
        invalidated: Mutex<bool>,
    }

    impl CopilotLlm for FakeLlm {
        fn resolve(&self) -> Option<CopilotLlmConfig> {
            self.config.clone()
        }
        fn invalidate(&self) {
            *self.invalidated.lock().unwrap() = true;
        }
        fn server_reachable(&self, _base_url: &str) -> bool {
            self.reachable
        }
        fn chat(
            &self,
            _config: &CopilotLlmConfig,
            _system: &str,
            _user_text: &str,
            _image_data_url: Option<&str>,
        ) -> Result<String, String> {
            self.chat_reply
                .clone()
                .ok_or_else(|| "llm unavailable".to_string())
        }
        fn chat_json(
            &self,
            _config: &CopilotLlmConfig,
            _system: &str,
            _user_text: &str,
        ) -> Result<String, String> {
            self.chat_json_reply
                .clone()
                .ok_or_else(|| "llm unavailable".to_string())
        }
        fn image_data_url(&self, _path: &str) -> Option<String> {
            Some("data:image/png;base64,AAAA".to_string())
        }
        fn test_connection(
            &self,
            _base_url: &str,
            _api_key: Option<&str>,
        ) -> Result<Vec<String>, String> {
            self.test_result
                .clone()
                .unwrap_or_else(|| Err("no server".to_string()))
        }
    }

    /// A scripted inference port. `detect_result` feeds copilot_detect/qa; the
    /// reads return whatever is configured.
    #[derive(Default)]
    struct FakeInference {
        image: Option<Value>,
        project_labels: Vec<Value>,
        annotations: Vec<Value>,
        predictions: Vec<Value>,
        detector_model_id: Option<String>,
        class_names: Vec<String>,
        detect_result: Mutex<Option<Result<Vec<Value>, String>>>,
        segment_result: Mutex<Option<Result<Vec<Value>, String>>>,
        detect_calls: Mutex<Vec<(String, Option<String>)>>,
    }

    impl CopilotInference for FakeInference {
        fn image(&self, _image_id: &str) -> DomainResult<Option<Value>> {
            Ok(self.image.clone())
        }
        fn project_labels(&self, _project_id: &str) -> DomainResult<Vec<Value>> {
            Ok(self.project_labels.clone())
        }
        fn annotations(&self, _image_id: &str) -> DomainResult<Vec<Value>> {
            Ok(self.annotations.clone())
        }
        fn predictions(&self, _image_id: &str) -> DomainResult<Vec<Value>> {
            Ok(self.predictions.clone())
        }
        fn detector_model_id(&self) -> DomainResult<Option<String>> {
            Ok(self.detector_model_id.clone())
        }
        fn detector_class_names(&self) -> Vec<String> {
            self.class_names.clone()
        }
        fn detect(
            &self,
            _image_id: &str,
            model_id: &str,
            target: Option<&str>,
        ) -> Result<Vec<Value>, String> {
            self.detect_calls
                .lock()
                .unwrap()
                .push((model_id.to_string(), target.map(ToString::to_string)));
            self.detect_result
                .lock()
                .unwrap()
                .clone()
                .unwrap_or_else(|| Ok(Vec::new()))
        }
        fn segment_boxes(
            &self,
            _image_id: &str,
            _boxes: Vec<BoxPrompt>,
            _target: Option<&str>,
        ) -> Result<Vec<Value>, String> {
            self.segment_result
                .lock()
                .unwrap()
                .clone()
                .unwrap_or_else(|| Ok(Vec::new()))
        }
    }

    fn detection(name: &str) -> Value {
        json!({
            "name": name,
            "labelName": name,
            "type": "rectangle",
            "confidence": 0.9,
            "coordinates": [{ "x": 0.0, "y": 0.0 }, { "x": 10.0, "y": 10.0 }],
        })
    }

    fn turn_payload(message: &str) -> CopilotTurnPayload {
        serde_json::from_value(json!({
            "itemId": "img-1",
            "message": message,
        }))
        .expect("payload")
    }

    fn service(llm: FakeLlm, inference: FakeInference) -> CopilotAppService {
        CopilotAppService::new(Arc::new(llm), Arc::new(inference))
    }

    #[test]
    fn turn_errors_when_the_image_is_missing() {
        let svc = service(FakeLlm::default(), FakeInference::default());
        let err = svc.turn(turn_payload("detect objects")).unwrap_err();
        assert_eq!(err, DomainError::not_found("Image"));
    }

    #[test]
    fn detect_without_a_model_explains_how_to_add_one() {
        let inference = FakeInference {
            image: Some(json!({ "id": "img-1", "projectId": "p1" })),
            ..Default::default()
        };
        let svc = service(FakeLlm::default(), inference);
        let result = svc.turn(turn_payload("detect objects")).expect("turn");
        assert_eq!(result.capability, "detect");
        assert_eq!(result.predictions_added, 0);
        assert!(result.reply.contains("don't have a detection model"));
    }

    #[test]
    fn detect_runs_the_detector_and_counts_predictions() {
        let inference = FakeInference {
            image: Some(json!({ "id": "img-1", "projectId": "p1" })),
            detector_model_id: Some("yolo".into()),
            detect_result: Mutex::new(Some(Ok(vec![detection("car"), detection("car")]))),
            ..Default::default()
        };
        let svc = service(FakeLlm::default(), inference);
        let result = svc.turn(turn_payload("detect objects")).expect("turn");
        assert_eq!(result.capability, "detect");
        assert_eq!(result.predictions_added, 2);
        // No LLM → deterministic fallback narration mentions the class summary.
        assert!(result.reply.contains("2 car"));
    }

    #[test]
    fn detect_with_a_specific_class_filters_the_detector() {
        let inference = FakeInference {
            image: Some(json!({ "id": "img-1", "projectId": "p1" })),
            detector_model_id: Some("yolo".into()),
            class_names: vec!["car".into(), "person".into()],
            detect_result: Mutex::new(Some(Ok(vec![detection("car")]))),
            ..Default::default()
        };
        let inference_ref: Arc<FakeInference> = Arc::new(inference);
        let svc = CopilotAppService::new(Arc::new(FakeLlm::default()), inference_ref.clone());
        let _ = svc.turn(turn_payload("find all cars")).expect("turn");
        // The detector was asked for "car", not a generic target.
        let calls = inference_ref.detect_calls.lock().unwrap();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].1.as_deref(), Some("car"));
    }

    #[test]
    fn qa_flags_a_missed_detection() {
        let inference = FakeInference {
            image: Some(json!({ "id": "img-1", "projectId": "p1" })),
            detector_model_id: Some("yolo".into()),
            // Detector sees a car; the image has no annotations → "missed".
            detect_result: Mutex::new(Some(Ok(vec![detection("car")]))),
            ..Default::default()
        };
        let svc = service(FakeLlm::default(), inference);
        let result = svc.turn(turn_payload("what did I miss")).expect("turn");
        assert_eq!(result.capability, "qa_review");
        assert!(result.findings.iter().any(|f| f.kind == "missed"));
    }

    #[test]
    fn disabled_tools_are_never_run() {
        let inference = FakeInference {
            image: Some(json!({ "id": "img-1", "projectId": "p1" })),
            detector_model_id: Some("yolo".into()),
            detect_result: Mutex::new(Some(Ok(vec![detection("car")]))),
            ..Default::default()
        };
        let inference_ref: Arc<FakeInference> = Arc::new(inference);
        let svc = CopilotAppService::new(Arc::new(FakeLlm::default()), inference_ref.clone());
        // "detect" disabled (only qa_review on) → detect must not run.
        let mut payload = turn_payload("detect objects");
        payload.enabled_tools = Some(vec!["qa_review".into()]);
        let result = svc.turn(payload).expect("turn");
        assert!(inference_ref.detect_calls.lock().unwrap().is_empty());
        assert!(result.reply.contains("turned off"));
    }

    #[test]
    fn test_connection_reports_models_and_invalidates_cache() {
        let llm = FakeLlm {
            test_result: Some(Ok(vec!["m1".into(), "m2".into()])),
            ..Default::default()
        };
        let llm_ref = Arc::new(llm);
        let svc =
            CopilotAppService::new(llm_ref.clone(), Arc::new(FakeInference::default()));
        let result = svc.test_connection(CopilotTestPayload {
            base_url: "http://localhost:1234".into(),
            api_key: None,
        });
        assert!(result.ok);
        assert_eq!(result.models.len(), 2);
        assert!(result.message.contains("2 models"));
        assert!(*llm_ref.invalidated.lock().unwrap());
    }

    #[test]
    fn test_connection_surfaces_the_error_message() {
        let llm = FakeLlm {
            test_result: Some(Err("Enter a server URL first.".into())),
            ..Default::default()
        };
        let svc = service(llm, FakeInference::default());
        let result = svc.test_connection(CopilotTestPayload {
            base_url: String::new(),
            api_key: None,
        });
        assert!(!result.ok);
        assert_eq!(result.message, "Enter a server URL first.");
    }
}
