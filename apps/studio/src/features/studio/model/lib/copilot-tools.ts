// The copilot's user-facing "tools". Each id matches a backend capability
// (`Capability::as_str` in domain/ai/copilot.rs) so the enabled set round-trips
// to `copilot_turn` and gates which tools may run. Order is the display order in
// the Tools menu and the quick-action chips.
export interface CopilotTool {
  /** Backend tool id (capability). */
  id: string
  label: string
  hint: string
  /** Prompt sent when the tool is used as a one-click quick action. */
  prompt: string
}

export const COPILOT_TOOLS: CopilotTool[] = [
  {
    id: "suggest_labels",
    label: "Suggest labels",
    hint: "Recommend label names from the image",
    prompt: "Suggest labels for this image",
  },
  {
    id: "detect",
    label: "Detect objects",
    hint: "Run the on-device detector",
    prompt: "Detect objects",
  },
  {
    id: "segment",
    label: "Outline / segment",
    hint: "Trace objects into polygons with SAM",
    prompt: "Outline the objects in this image",
  },
  {
    id: "qa_review",
    label: "Check what I missed",
    hint: "Review my labels for gaps and mistakes",
    prompt: "Check what I missed",
  },
  {
    id: "describe",
    label: "Describe image",
    hint: "Summarize what's in the image",
    prompt: "Describe this image",
  },
  {
    id: "ocr",
    label: "Read text (OCR)",
    hint: "Extract readable text from the image",
    prompt: "Read the text in this image",
  },
]

export const ALL_COPILOT_TOOL_IDS = COPILOT_TOOLS.map((tool) => tool.id)

/** Keep only known tool ids, preserving the canonical display order. */
export function sanitizeToolIds(ids: string[]): string[] {
  const wanted = new Set(ids)
  return ALL_COPILOT_TOOL_IDS.filter((id) => wanted.has(id))
}
