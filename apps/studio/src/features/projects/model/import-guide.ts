import type { LabelConfig } from "@/shared/lib/label-config/types"
import type { ModalityDescriptor } from "./modality-registry"

// Per-template "what data do I import?" guidance for the create flow's Data step.
// The expected spreadsheet columns are derived from the labeling config itself
// (its `$`-bound fields), so the hint always matches what the editor will read —
// it can't drift from the template definition.

export interface ImportColumn {
  /** The exact header the spreadsheet needs (the config field key). */
  key: string
  /** Friendly name (the field's title), for display next to the key. */
  label: string
}

export interface ImportGuide {
  /** One-line "what to do". */
  title: string
  /** Longer explanation of the expected data. */
  detail: string
  /** Accepted file formats, e.g. "csv, tsv, xlsx". */
  formats: string
  /** Expected spreadsheet columns (multi-field / LLM-eval tasks), if any. */
  columns: ImportColumn[]
  /** A concrete sample of the expected file layout, rendered as a code block so
   *  the user can match the exact format that makes labeling work. */
  example: string
}

// Extensions are stored as drag-drop regex fragments ("jpe?g", "tiff?"); strip
// the regex bits for a readable extension.
function readableExt(ext: string): string {
  return ext.replace(/[?]/g, "")
}

function readableFormats(extensions: string[]): string {
  return extensions.map(readableExt).join(", ")
}

// Realistic sample values per known field, so the example file reads like real
// data; unknown fields fall back to a placeholder.
const SAMPLE_VALUES: Record<string, string> = {
  prompt: "Explain photosynthesis in one sentence.",
  response: "Photosynthesis converts light into chemical energy.",
  response_a: "Plants turn sunlight into energy.",
  response_b: "Photosynthesis converts light into sugars.",
  question: "What is the capital of France?",
  context: "France is a country in Western Europe; its capital is Paris.",
  answer: "Paris",
  conversation: "User: Hi — Assistant: Hello! How can I help?",
  user_request: "Book a flight to Tokyo next Friday.",
  tool_call: "search_flights(destination=Tokyo, date=2025-06-27)",
  text: "The product arrived on time and works great.",
}

/** Quote a CSV cell only when it contains a comma, quote, or newline. */
function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** A header row + one sample data row for the given columns. */
function csvExample(columns: ImportColumn[]): string {
  const header = columns.map((column) => column.key).join(",")
  const row = columns
    .map((column) => csvCell(SAMPLE_VALUES[column.key] ?? "…"))
    .join(",")
  return `${header}\n${row}`
}

/**
 * Spreadsheet columns a config expects: its data-bound (`$`) fields, excluding a
 * whole-row `table` object (which consumes every column). Empty for non-tabular
 * configs.
 */
export function expectedColumns(config: LabelConfig | null): ImportColumn[] {
  if (!config) return []
  return config.objects
    .filter((object) => object.value.startsWith("$") && object.tag !== "table")
    .map((object) => ({
      key: object.valueKey,
      label: object.attrs.title || object.valueKey,
    }))
}

/** Describe what to import for the selected template's data kind. */
export function describeImport(
  descriptor: ModalityDescriptor,
  config: LabelConfig | null
): ImportGuide {
  const formats = readableFormats(descriptor.extensions)
  const columns = expectedColumns(config)
  const ext = readableExt(descriptor.extensions[0] ?? "dat")

  switch (descriptor.importMode) {
    case "folder":
      return {
        title: "Select a folder of images",
        detail:
          "We scan the folder and reference each image in place — files are never copied. LabelMe sidecars already in the folder are imported too.",
        formats,
        columns: [],
        example: `my-dataset/\n  image-001.jpg\n  image-002.jpg\n  image-003.png`,
      }
    case "files":
      return {
        title: `Select ${descriptor.label.toLowerCase()} files`,
        detail:
          "Pick one or more files; each file becomes one labeling task, referenced in place.",
        formats,
        columns: [],
        example: `sample-001.${ext}\nsample-002.${ext}`,
      }
    case "spreadsheet":
      return {
        title: "Import a spreadsheet — one row per task",
        detail:
          columns.length > 0
            ? "CSV, TSV, or Excel. Each row is one task; the header columns below fill the labeling fields, so the header must match these names."
            : "CSV, TSV, or Excel. Each row is one task and every column is shown for labeling.",
        formats,
        columns,
        example:
          columns.length > 0
            ? csvExample(columns)
            : `id,text\n1,${csvCell("First row to label")}\n2,${csvCell("Second row to label")}`,
      }
    case "none":
      return {
        title: "Import clips in the studio",
        detail:
          "Create the project, then import and process your video clips inside the studio editor.",
        formats,
        columns: [],
        example: "",
      }
  }
}
