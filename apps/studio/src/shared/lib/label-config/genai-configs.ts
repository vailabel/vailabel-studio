import type { LabelConfig } from "./types"
import { ch, ctrl, pairwise, textObj } from "./builders"

// Generative-AI / LLM-evaluation starter configs, keyed by template id. Each
// task is one spreadsheet row whose columns map to the object field names below
// (prompt, response_a, …); the config-driven editor renders every field as a
// read-only panel plus the scoring controls, storing results in the generic
// result envelope. Adding a GenAI template = one entry here + one entry in
// labeling-templates.ts.
export const GENAI_CONFIGS: Record<string, () => LabelConfig> = {
  rlhf: () => ({
    objects: [
      textObj("prompt", "Prompt"),
      textObj("response_a", "Response A"),
      textObj("response_b", "Response B"),
    ],
    controls: [
      pairwise("preference", "response_a", "response_b", "Which response is better?"),
      ctrl("textarea", "rationale", "prompt", [], { title: "Rationale" }),
    ],
  }),
  "side-by-side-llm": () => ({
    objects: [
      textObj("prompt", "Prompt"),
      textObj("response_a", "Response A"),
      textObj("response_b", "Response B"),
    ],
    controls: [
      pairwise("preference", "response_a", "response_b", "Preferred response"),
      ctrl(
        "choices",
        "overall",
        "prompt",
        [ch("Both acceptable"), ch("Both poor"), ch("Hard to tell")],
        { title: "Overall", choice: "single" }
      ),
      ctrl("textarea", "notes", "prompt", [], { title: "Notes" }),
    ],
  }),
  "llm-response-grading": () => ({
    objects: [textObj("prompt", "Prompt"), textObj("response", "Model response")],
    controls: [
      ctrl("rating", "quality", "response", [], {
        title: "Overall quality",
        maxRating: "5",
      }),
      ctrl(
        "choices",
        "verdict",
        "response",
        [
          ch("Correct", "#10b981"),
          ch("Partially correct", "#f59e0b"),
          ch("Incorrect", "#ef4444"),
        ],
        { title: "Verdict", choice: "single" }
      ),
      ctrl("textarea", "feedback", "response", [], { title: "Feedback" }),
    ],
  }),
  "rag-evaluation": () => ({
    objects: [
      textObj("question", "Question"),
      textObj("context", "Retrieved context"),
      textObj("answer", "Generated answer"),
    ],
    controls: [
      ctrl("rating", "faithfulness", "answer", [], {
        title: "Faithfulness to context",
        maxRating: "5",
      }),
      ctrl("rating", "relevance", "answer", [], {
        title: "Answer relevance",
        maxRating: "5",
      }),
      ctrl(
        "choices",
        "grounding",
        "answer",
        [
          ch("Grounded", "#10b981"),
          ch("Partially grounded", "#f59e0b"),
          ch("Hallucinated", "#ef4444"),
        ],
        { title: "Grounding", choice: "single" }
      ),
      ctrl("textarea", "notes", "answer", [], { title: "Notes" }),
    ],
  }),
  "chatbot-assessment": () => ({
    objects: [textObj("conversation", "Conversation")],
    controls: [
      ctrl("rating", "helpfulness", "conversation", [], {
        title: "Helpfulness",
        maxRating: "5",
      }),
      ctrl(
        "choices",
        "flags",
        "conversation",
        [
          ch("Helpful", "#10b981"),
          ch("Off-topic", "#f59e0b"),
          ch("Unsafe", "#ef4444"),
          ch("Refused", "#6366f1"),
        ],
        { title: "Flags", choice: "multiple" }
      ),
      ctrl("textarea", "notes", "conversation", [], { title: "Notes" }),
    ],
  }),
  "hallucination-detection": () => ({
    objects: [textObj("prompt", "Prompt"), textObj("response", "Model response")],
    controls: [
      ctrl(
        "choices",
        "verdict",
        "response",
        [
          ch("Faithful", "#10b981"),
          ch("Minor hallucination", "#f59e0b"),
          ch("Major hallucination", "#ef4444"),
        ],
        { title: "Hallucination", choice: "single" }
      ),
      ctrl("textarea", "evidence", "response", [], {
        title: "Unsupported claims",
      }),
    ],
  }),
  "safety-rating": () => ({
    objects: [textObj("prompt", "Prompt"), textObj("response", "Model response")],
    controls: [
      ctrl(
        "choices",
        "category",
        "response",
        [
          ch("Safe", "#10b981"),
          ch("Hate", "#ef4444"),
          ch("Harassment", "#f59e0b"),
          ch("Self-harm", "#ec4899"),
          ch("Violence", "#8b5cf6"),
          ch("Sexual", "#06b6d4"),
        ],
        { title: "Safety category", choice: "multiple" }
      ),
      ctrl("rating", "severity", "response", [], {
        title: "Severity",
        maxRating: "5",
      }),
      ctrl("textarea", "notes", "response", [], { title: "Notes" }),
    ],
  }),
  "function-calling-eval": () => ({
    objects: [
      textObj("user_request", "User request"),
      textObj("tool_call", "Tool call"),
    ],
    controls: [
      ctrl(
        "choices",
        "tool_choice",
        "tool_call",
        [
          ch("Correct tool", "#10b981"),
          ch("Wrong tool", "#ef4444"),
          ch("No call needed", "#6366f1"),
        ],
        { title: "Tool selection", choice: "single" }
      ),
      ctrl(
        "choices",
        "arguments",
        "tool_call",
        [
          ch("Args correct", "#10b981"),
          ch("Args incomplete", "#f59e0b"),
          ch("Args wrong", "#ef4444"),
        ],
        { title: "Arguments", choice: "single" }
      ),
      ctrl("textarea", "notes", "tool_call", [], { title: "Notes" }),
    ],
  }),
}
