# AI Copilot Architecture (Local VLM)

A design for an **offline, on-device AI copilot** that helps users label faster — a
chat surface in the studio that can *see* the current image, answer questions about
it, and take labeling actions (detect, segment, caption, QA) — running entirely on
local ONNX models with no cloud calls.

This document builds on the existing AI scaffolding rather than introducing new
structure. Read it alongside:

- `src-tauri/src/domain/ai/registry.rs` — the model catalog (Florence-2, SAM, etc.)
- `src-tauri/src/domain/ai/plugin.rs` — the `ModelPlugin` trait + `plugin_for` dispatcher
- `src-tauri/src/domain/ai/service.rs` — `generate_predictions` and the predictions path
- `src/types/ai-assistant.ts` — the `AiModelTask` / `AiCapability` enums
- `src/components/ai/prediction-review-panel.tsx` — the accept/reject loop the copilot reuses

---

## 1. Goals & constraints

- **Offline-first, local-only.** No network inference. The copilot runs through the
  same ONNX Runtime stack as the existing YOLO detector (`crate::inference`), honoring
  GPU/CPU execution providers from `gpu.rs`.
- **Helps labeling, not generic chat.** Every capability produces something useful in
  the labeling loop: an annotation draft, a QA finding, a label schema, a caption.
- **Human-in-the-loop by default.** The copilot *proposes*; the user *disposes*.
  AI-generated geometry lands as predictions in the existing review panel; any
  mutation of existing data goes through an in-chat approve/deny gate.
- **Reuse what exists.** Model management (`/ai-models`), the registry, the plugin
  dispatcher, the predictions path, domain-event refetch, and image-space coordinates
  are all reused — the copilot is additive.

---

## 2. Key architectural decisions

### 2.1 Deterministic intent routing, **not** model-driven tool use

Small local VLMs cannot reliably run a function-calling / tool-use loop the way a
frontier cloud model can. So the copilot does **not** let the model decide which tool
to call. Instead:

```
user message ──▶ intent router ──▶ capability ──▶ plugin/engine ──▶ output
                 (rules + light       (enum)        (ONNX)          (text and/or
                  classifier)                                        annotation drafts)
```

The **chat is still real** — the VLM generates natural-language text for describe/QA
answers. But the **actions are dispatched deterministically** from a parsed intent,
which is far more robust on-device. The router is a thin layer (keyword/grammar rules
plus, optionally, a tiny instruct classifier) that maps a message to one capability +
its arguments (e.g. the target class for "label all the cars").

This is the single biggest departure from a cloud-copilot design, and it shapes
everything below.

### 2.2 Florence-2 is the v1 workhorse

Florence-2 is already in the registry (`status: "planned"`) and natively covers the
labeling-relevant tasks through task tokens — captioning, open-vocabulary detection,
dense region captioning, region→segmentation, and OCR — returning geometry in image
coordinates that map 1:1 to our image-space annotations. One model unlocks most of the
copilot. It is **task-prompted, not conversational**, which is exactly why the intent
router (2.1) sits in front of it.

### 2.3 Extend the plugin output to carry text

The current `ModelPlugin::run` returns only `Vec<InferenceAnnotationDraft>`. A copilot
turn can also produce **text** (a caption, a QA verdict) and **regions** (labeled
boxes for "what's here"). We add a copilot-level output type rather than overloading
the detection pipeline — see §6.1.

### 2.4 Conversational VLM is optional and later

Genuine multi-turn dialogue ("why did you label that?", follow-ups) needs a small chat
VLM (Moondream2 / SmolVLM / Qwen2.5-VL). It is **Phase C**, not v1, because Florence-2
+ deterministic routing already delivers the labeling value without the extra weight
and complexity.

---

## 3. Model selection

| Model | Role | Task tokens / mode | Size | ONNX components | Tokenizer | License |
|---|---|---|---|---|---|---|
| **Florence-2** (base/large) | Primary copilot vision model | `<DETAILED_CAPTION>`, `<DENSE_REGION_CAPTION>`, `<OD>`, `<OPEN_VOCABULARY_DETECTION>`, `<REGION_TO_SEGMENTATION>`, `<OCR_WITH_REGION>`, `<CAPTION_TO_PHRASE_GROUNDING>` | ~0.23B / ~0.77B | vision_encoder, encoder, decoder, embed_tokens | yes | MIT |
| **MobileSAM / SAM 2** | Interactive segmentation | point/box prompt → mask → polygon | ~10M / ~38M+ | image_encoder, mask_decoder | no | Apache/BSD |
| **YOLO** (existing) | Fast closed-vocab detect | — | n/s/m/l/x | model.onnx | no | — |
| **Grounding DINO / YOLO-World** | Alt open-vocab detect | text prompt → boxes | ~50–172M | (single) | yes | — |
| *Chat VLM (Phase C)* | Free-form dialogue | conversation | 0.25–3B | varies | yes | varies |

All entries except YOLO are already declared in `registry.rs`. Implementing one =
write its `ModelPlugin`, wire it in `plugin_for`, flip `status` to `"available"`
(per the registry doc-comment). Download definitions reuse the existing
install/import flow on `/ai-models`.

**Runtime sizing.** Florence-2 base runs on CPU but benefits from a GPU execution
provider; surface the choice through the existing `ai_gpu_info` / `AiRuntimeStatus`.
Quantized (int8) ONNX exports are recommended for CPU-only machines.

---

## 4. System architecture

```
┌───────────────────────────── Frontend (React) ─────────────────────────────┐
│  AiCopilotPanel ──▶ useAiCopilotViewModel ──▶ aiCopilotService ──▶ studioCommands │
│      ▲ streaming tokens (Tauri channel)         │                                │
│      │ proposed annotations → PredictionReviewPanel (existing accept/reject)     │
│      │ destructive action → in-chat Approve/Deny card                            │
└──────┼──────────────────────────────────────────┼──────────────────────────────┘
       │  events ("studio://copilot-token")        │  invoke ai_copilot_*
┌──────┼──────────────────────────────────────────┼──────────────────────────────┐
│      ▼                Backend (Rust / Tauri)     ▼                               │
│  CopilotService                                                                   │
│    ├─ IntentRouter         (message → capability + args)                          │
│    ├─ ContextBuilder       (image path, labels, existing annotations)            │
│    ├─ CopilotEngine/Plugin (Florence-2, SAM, YOLO via ModelPlugin)              │
│    │     └─ crate::inference (ONNX Runtime + gpu.rs execution providers)         │
│    └─ Output: text (streamed) + Vec<InferenceAnnotationDraft>                    │
│  Drafts ──▶ predictions (store.rs)  ──▶ emit "studio://domain-event"             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Drafts flow into the **existing predictions path** (`store.rs` + the predictions
domain events), so the canvas review UI lights up exactly as it does for YOLO today.
Text streams over a dedicated Tauri channel/event for the chat typing effect.

---

## 5. Capability → model → existing IPC (the local "tool schema")

This is the copilot's action surface. Each row is a deterministic route, not a
model-emitted tool call.

| User intent | `AiCapability` | Model | Mechanism | Output lands as | Reuses |
|---|---|---|---|---|---|
| "Describe this image" | `describe` *(new)* | Florence-2 | `<DETAILED_CAPTION>` | chat text | new `ai_copilot_describe` |
| "What's in here?" | `dense_regions` *(new)* | Florence-2 | `<DENSE_REGION_CAPTION>` | predictions + text | predictions path |
| "Label all the cars" | `prompt_to_detect` | Florence-2 / Grounding-DINO / YOLO-World | `<OPEN_VOCABULARY_DETECTION> cars` | box predictions | predictions path |
| "Detect everything" | `auto_bounding_box` | YOLO (available) / Florence `<OD>` | full-image detect | box predictions | `predictions_generate` |
| "Segment this object" | `click_to_segment` | MobileSAM / SAM 2 | point/box prompt → mask → polygon | polygon predictions | `plugin.rs` `PromptInput` |
| "Outline this region" | `auto_polygon` | Florence-2 / SAM | `<REGION_TO_SEGMENTATION>` (box) | polygon predictions | predictions path |
| "Read the text" | `ocr` *(new)* | Florence-2 | `<OCR_WITH_REGION>` | chat text + regions | new |
| "Check what I missed" | `qa_review` *(new, composed)* | Florence-2 + diff logic | dense detect → IoU/class diff vs existing | findings + suggested fixes | annotations list + save/delete (gated) |
| "Suggest labels for this project" | `schema_suggest` *(new)* | Florence-2 caption → class proposal | caption → label set | proposed labels (gated) | `labelsSave` |
| "Summarize the dataset" | — | (no VLM) | dataset-intelligence | chat text | `analysisRun` |

New capabilities to add to `AiCapability` / `CAPABILITY_LABELS` in
`src/types/ai-assistant.ts`: `describe`, `dense_regions`, `ocr`, `qa_review`,
`schema_suggest`. They mirror Rust-side capability strings in `registry.rs`.

`qa_review` is **composed** (not a single model task): run dense/open-vocab detection,
diff the results against the image's existing annotations (IoU + class match), and
surface three finding types — missed objects, likely mislabels, loose/overlapping
boxes. Suggested fixes are applied only through the approve/deny gate (§7).

---

## 6. Backend design (Rust)

### 6.1 Copilot output type + engine

Keep `ModelPlugin` (detection/segmentation → drafts) intact. Add a copilot-facing
output and a thin engine that composes plugins with text:

```rust
// domain/ai/copilot/mod.rs (new)
pub struct CopilotTurnOutput {
    /// Natural-language answer streamed to the chat (caption, QA verdict, …).
    pub text: Option<String>,
    /// Geometry to surface as predictions for review.
    pub drafts: Vec<InferenceAnnotationDraft>,
    /// Proposed mutations to existing data, requiring approval (relabel, delete).
    pub proposed_actions: Vec<ProposedAction>,
}

pub enum ProposedAction {
    Relabel { annotation_id: String, to_label: String },
    Delete  { annotation_id: String },
    CreateLabel { name: String, color: String },
}
```

Florence-2 gets a real `ModelPlugin` (vision_encoder → encoder → decoder loop with the
embed_tokens path and its tokenizer), producing drafts for grounding tasks. The
`CopilotService` wraps it to also return text for caption/QA tasks.

### 6.2 Intent router

```rust
// domain/ai/copilot/router.rs (new)
pub struct RoutedIntent {
    pub capability: Capability,   // describe | dense_regions | prompt_to_detect | …
    pub target: Option<String>,   // e.g. "cars" for prompt_to_detect
    pub region: Option<BoxPrompt> // for region tasks
}
pub fn route(message: &str, ctx: &TurnContext) -> RoutedIntent;
```

Start with rules/grammar (verbs + class names from the project's labels). A tiny
optional instruct classifier can improve recall later; it is not required for v1.

### 6.3 New Tauri commands

Add to `domain/ai/commands.rs` (registered in `lib.rs`), mirroring the existing
`predictions_generate` shape (async + `spawn_blocking` for the heavy ONNX work):

| Command | Purpose |
|---|---|
| `ai_copilot_turn` | Run one routed turn; returns `CopilotTurnOutput` (drafts already persisted as predictions). |
| `ai_copilot_qa` | Composed QA pass for an image; returns findings. |
| `ai_copilot_apply_action` | Apply an approved `ProposedAction` (relabel/delete/create-label). |

### 6.4 Streaming

The decoder emits tokens incrementally. Stream them to the frontend via a Tauri
`Channel<TokenChunk>` (preferred) or `app.emit("studio://copilot-token", …)`, so the
chat renders a typing effect. The final drafts are persisted as predictions and the
existing `studio://domain-event` triggers the canvas refetch.

### 6.5 Threading

ONNX inference is blocking — run every copilot command on
`tauri::async_runtime::spawn_blocking`, exactly as `predictions_generate` already does.
A single `Mutex`-guarded engine instance (matching the existing pattern) serializes
model access.

---

## 7. Human-in-the-loop & trust model

| Output kind | How it surfaces | Commit path |
|---|---|---|
| Caption / QA text | Chat message | none (read-only) |
| New geometry (boxes/polygons) | Predictions on canvas + review panel | user Accept → annotation |
| Relabel / delete existing | **Approve/Deny card in chat** | `ai_copilot_apply_action` only on Approve |
| Create label | Approve/Deny card | `labelsSave` only on Approve |

Principles:

- The copilot **never silently mutates** user data. Geometry is always a proposal;
  mutations always pass a gate.
- Everything is **undoable** — applied actions go through the same create/update/delete
  path that `use-canvas-session` already wraps for undo/redo.
- The copilot shows **what it saw** (image thumbnail in the turn) and **what it
  referenced** (the annotation ids in a QA finding), so the user can verify.
- Confidence and model/version are shown on every proposal (reuse prediction badges).

---

## 8. The turn lifecycle

1. User types in `AiCopilotPanel` (or taps a quick action).
2. `useAiCopilotViewModel` gathers context: current `projectId`, `imageId`, label
   schema, and existing annotations; calls `aiCopilotService.turn(...)`.
3. `ai_copilot_turn` (Rust) routes the message → capability + args.
4. `ContextBuilder` loads the image (path → pixels) and any region/annotation inputs.
5. The engine runs the relevant plugin (Florence-2 / SAM / YOLO) on `spawn_blocking`;
   text tokens stream back over the channel.
6. Geometry drafts are written as **predictions**; `studio://domain-event` fires;
   the canvas + `PredictionReviewPanel` update.
7. Proposed mutations render as **approve/deny cards**; on Approve the frontend calls
   `ai_copilot_apply_action`, which routes through the normal save/delete path.
8. User accepts/rejects predictions on the canvas as usual.

---

## 9. Context management & limits

- Small VLMs have tight context. Keep per-turn context lean: the image, the routed
  intent, and (for QA) a **compact** representation of existing annotations
  (class + box), not a verbose dump.
- For QA, prefer giving the model the raw image and computing the diff in Rust over
  asking the model to reason about overlaid boxes — more reliable on small models.
- Cache the Florence-2 **vision-encoder output per image** so multiple turns on the
  same image (describe, then detect, then QA) don't re-encode pixels.
- Keep chat history short; this is a task assistant, not a long conversation. Multi-
  turn memory arrives with the optional chat VLM (Phase C).

---

## 10. Phased delivery

**Phase A — read-only copilot (lowest risk, proves value).**
- Wire the Florence-2 `ModelPlugin` for `<DETAILED_CAPTION>` + `<OCR_WITH_REGION>`.
- `AiCopilotPanel` + viewmodel + `ai_copilot_turn` (text only) + streaming.
- Capabilities: `describe`, `ocr`. No mutations, no predictions.

**Phase B — grounded actions → predictions.**
- Florence-2 `<OPEN_VOCABULARY_DETECTION>` + `<DENSE_REGION_CAPTION>` +
  `<REGION_TO_SEGMENTATION>`; optionally MobileSAM for click-to-segment.
- Drafts land in the predictions review loop. Capabilities: `prompt_to_detect`,
  `dense_regions`, `auto_polygon`.

**Phase C — QA, schema, batch, and (optional) chat VLM.**
- `qa_review` composer + approve/deny gate + `ai_copilot_apply_action`.
- `schema_suggest`; dataset summary via `analysisRun`.
- Batch sweep ("check the next N images"); optional small chat VLM for free-form
  multi-turn dialogue.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Small-VLM accuracy / hallucination | HITL everywhere; predictions are proposals; QA findings cite ids. |
| CPU latency | int8 ONNX, vision-encoder caching, GPU EP via `gpu_info`, `spawn_blocking` so UI never blocks. |
| Florence-2 seq2seq wiring is the hardest plugin | Phase A ships caption/OCR first (simplest decode); grounding tasks build on the same loop. |
| Intent router misroutes | Rules + project label vocabulary first; quick-action buttons bypass NLU entirely. |
| Model download size | Reuse `/ai-models` install flow; offer base + quantized variants in the catalog. |

---

## 12. Implementation checklist (concrete files)

**Backend (`src-tauri/src/`):**
- `domain/ai/copilot/mod.rs` — `CopilotService`, `CopilotTurnOutput`, `ProposedAction`.
- `domain/ai/copilot/router.rs` — intent routing.
- `domain/ai/plugin_florence2.rs` — Florence-2 `ModelPlugin` (the seq2seq engine).
- `domain/ai/plugin.rs` — branch Florence-2/SAM in `plugin_for`.
- `domain/ai/registry.rs` — flip `florence-2` (and SAM) `status` to `"available"`; add
  copilot capability strings.
- `domain/ai/commands.rs` + `lib.rs` — `ai_copilot_turn`, `ai_copilot_qa`,
  `ai_copilot_apply_action`; register them.
- `inference/` — Florence-2 ONNX session(s) alongside the YOLO engine.

**Frontend (`src/`):**
- `components/ai/ai-copilot-panel.tsx` — the docked chat surface (replaces the deleted
  `ai-assistant-panel.tsx`).
- `viewmodels/ai-copilot-viewmodel.ts` — turn state, streaming, context gathering.
- `services/ai-copilot-service.ts` — wraps the new `ai_copilot_*` commands.
- `ipc/studio.ts` — add the `ai_copilot_*` command bindings + token channel.
- `types/ai-assistant.ts` — new `AiCapability` values + labels.
- `components/studio/image-labeler.tsx` — dock the panel; reuse `PredictionReviewPanel`
  for proposed geometry.
- `ipc/events.ts` — subscribe to `studio://copilot-token` for streaming.
