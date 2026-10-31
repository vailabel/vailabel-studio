import type { DataKind } from "@/shared/lib/label-config/labeling-templates"
import type { LabelConfig } from "@/shared/lib/label-config/types"
import { parseLabelConfig } from "@/shared/lib/label-config/parse"
import { isMultiFieldJudgement } from "@/shared/lib/label-config/infer"
import { toErrorMessage } from "@/shared/lib/errors"

export interface ConfigInfo {
  ok: boolean
  config: LabelConfig | null
  dataKind: DataKind
  error: string | null
}

/** The data kind each object tag imports (what the Data step asks for). */
const OBJECT_DATA_KIND: Record<string, DataKind> = {
  image: "image",
  text: "text",
  audio: "audio",
  video: "video",
  table: "tabular",
  hypertext: "html",
  timeseries: "timeseries",
  pdf: "pdf",
  pointcloud: "pointcloud",
  dicom: "dicom",
  paragraphs: "text",
  chat: "text",
  list: "text",
}

/**
 * The labeling config is the single source of truth for validity, the data kind
 * to import, and the visual editor + preview. Parses it once and reports all
 * three, never throwing.
 */
export function deriveConfigInfo(source: string): ConfigInfo {
  try {
    const parsed = parseLabelConfig(source)

    // The first object with a known data kind decides what gets imported.
    const primary = parsed.objects.find(
      (object) => OBJECT_DATA_KIND[object.tag]
    )

    // Multi-field judgement tasks (prompt + responses, query + candidates,
    // several images) and `table` objects are one-row-per-task, so they import
    // via the spreadsheet path (each row carries its fields inline).
    const dataKind: DataKind = isMultiFieldJudgement(parsed)
      ? "tabular"
      : ((primary && OBJECT_DATA_KIND[primary.tag]) ?? "image")

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
      error: toErrorMessage(error, "Invalid config"),
    }
  }
}
