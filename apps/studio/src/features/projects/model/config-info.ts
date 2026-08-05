import type { DataKind } from "@/shared/lib/label-config/labeling-templates"
import type { LabelConfig } from "@/shared/lib/label-config/types"
import { parseLabelConfig } from "@/shared/lib/label-config/parse"
import { isMultiTextJudgement } from "@/shared/lib/label-config/infer"

export interface ConfigInfo {
  ok: boolean
  config: LabelConfig | null
  dataKind: DataKind
  error: string | null
}

/** Object tags that map directly onto a data kind. */
const DATA_OBJECT_TAGS = ["image", "text", "audio", "video", "table"]

/**
 * The labeling config is the single source of truth for validity, the data kind
 * to import, and the visual editor + preview. Parses it once and reports all
 * three, never throwing.
 */
export function deriveConfigInfo(source: string): ConfigInfo {
  try {
    const parsed = parseLabelConfig(source)

    // The primary object tag maps to a data kind. For image/text/audio/video
    // the tag IS the kind; the `table` object maps to the `tabular` kind.
    const primary = parsed.objects.find((object) =>
      DATA_OBJECT_TAGS.includes(object.tag)
    )

    // Multi-field LLM-eval tasks (prompt + responses) and explicit `table`
    // objects are one-row-per-task, so they import via the spreadsheet path
    // (each row carries its fields inline). Everything else maps the primary
    // object tag straight to its data kind.
    const dataKind: DataKind =
      isMultiTextJudgement(parsed) || primary?.tag === "table"
        ? "tabular"
        : ((primary?.tag as DataKind) ?? "image")

    const ok = parsed.objects.length > 0 && parsed.controls.length > 0
    return {
      ok,
      config: parsed,
      dataKind,
      error: ok ? null : "Add a data object and at least one control.",
    }
  } catch (error) {
    return {
      ok: false,
      config: null,
      dataKind: "image",
      error: error instanceof Error ? error.message : "Invalid config",
    }
  }
}
