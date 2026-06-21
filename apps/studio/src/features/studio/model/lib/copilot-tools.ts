import type { Modality, Task } from "@/shared/types/modality"

// The copilot's user-facing "tools". Each id matches a backend capability
// (`Capability::as_str` in the copilot crate's `routing.rs`) so the enabled set
// round-trips to `copilot_turn` and gates which tools may run.
//
// Tools are tagged with the modalities they apply to: image gets the full
// detector/SAM/vision set; text/tabular/custom add LLM-driven summarize; every
// modality keeps `suggest_labels` (and free-text chat is always available via
// the input box). `copilotToolsFor` selects the set for a project's modality so
// the quick actions, Tools menu, and empty state stay consistent everywhere.
export interface CopilotTool {
  /** Backend tool id (capability). */
  id: string
  label: string
  hint: string
  /** Prompt sent when the tool is used as a one-click quick action. */
  prompt: string
}

interface CatalogEntry extends CopilotTool {
  /** Modalities this tool is offered in. */
  modalities: Modality[]
}

const ALL_MODALITIES: Modality[] = [
  "image",
  "text",
  "tabular",
  "audio",
  "video",
  "custom",
]

// Canonical catalog + display order. The union of ids is the master list.
const CATALOG: CatalogEntry[] = [
  {
    id: "suggest_labels",
    label: "Suggest labels",
    hint: "Recommend label names to add to your project",
    prompt: "Suggest labels",
    modalities: ALL_MODALITIES,
  },
  {
    id: "detect",
    label: "Detect objects",
    hint: "Run the on-device detector",
    prompt: "Detect objects",
    modalities: ["image"],
  },
  {
    id: "segment",
    label: "Outline / segment",
    hint: "Trace objects into polygons with SAM",
    prompt: "Outline the objects in this image",
    modalities: ["image"],
  },
  {
    id: "qa_review",
    label: "Check what I missed",
    hint: "Review my labels for gaps and mistakes",
    prompt: "Check what I missed",
    modalities: ["image"],
  },
  {
    id: "describe",
    label: "Describe image",
    hint: "Summarize what's in the image",
    prompt: "Describe this image",
    modalities: ["image"],
  },
  {
    id: "ocr",
    label: "Read text (OCR)",
    hint: "Extract readable text from the image",
    prompt: "Read the text in this image",
    modalities: ["image"],
  },
  {
    id: "summarize",
    label: "Summarize",
    hint: "Summarize this item's content",
    prompt: "Summarize this",
    modalities: ["text", "tabular", "custom"],
  },
]

/** Every known tool id, in canonical order (the union across all modalities). */
export const ALL_COPILOT_TOOL_IDS = CATALOG.map((tool) => tool.id)

/**
 * The copilot tools offered for a project's modality, in display order. Falls
 * back to the image set when the modality is unknown/undefined. (`task` is
 * reserved for finer per-task tuning; the backend already tailors prompts by it.)
 */
export function copilotToolsFor(
  modality?: Modality | string,
  task?: Task | string
): CopilotTool[] {
  void task
  const resolved = (modality ?? "image") as Modality
  return CATALOG.filter((entry) => entry.modalities.includes(resolved)).map(
    (entry) => ({
      id: entry.id,
      label: entry.label,
      hint: entry.hint,
      prompt: entry.prompt,
    })
  )
}

/** Keep only known tool ids, preserving the canonical display order. */
export function sanitizeToolIds(ids: string[]): string[] {
  const wanted = new Set(ids)
  return ALL_COPILOT_TOOL_IDS.filter((id) => wanted.has(id))
}
