import type { ControlTag, LabelConfig } from "./types"
import { objectByName } from "./types"
import { isSpatialControl } from "./config-helpers"
import { inferModalityTask } from "./infer"

// What the labeling editors can actually render. A template is "available"
// exactly when its config passes `isConfigSupported` — the catalog never
// hand-flags support, so adding a viewer or widget here unlocks every template
// that was waiting on it.

/** Whole-item controls with a widget (see controls/control-registry.ts, which a
 *  test keeps in sync with this list). */
export const STANDALONE_CONTROL_TAGS = [
  "choices",
  "taxonomy",
  "rating",
  "number",
  "textarea",
  "pairwise",
  "ranker",
  "datetime",
] as const

/** Shape tools of the raster region surface (images, PDF pages). */
const RASTER_REGION_CONTROLS = [
  "rectanglelabels",
  "polygonlabels",
  "keypointlabels",
  "ellipselabels",
  "brushlabels",
  "rectangle",
  "polygon",
  "keypoint",
  "ellipse",
  "brush",
] as const

/** Region controls the config-driven editor can draw, per object tag. */
export const REGION_CONTROLS_BY_OBJECT: Record<string, readonly string[]> = {
  image: RASTER_REGION_CONTROLS,
  pdf: RASTER_REGION_CONTROLS,
  text: ["labels"],
  audio: ["labels"],
  hypertext: ["hypertextlabels", "labels"],
  timeseries: ["timeserieslabels"],
  paragraphs: ["paragraphlabels"],
  video: ["videorectangle"],
}

/** Object tags with an interactive viewer in the config-driven editor (see
 *  editors/custom/object-viewers.tsx, which a test keeps in sync). */
export const VIEWER_OBJECT_TAGS = [
  "image",
  "text",
  "audio",
  "video",
  "hypertext",
  "timeseries",
  "pdf",
  "paragraphs",
  "chat",
] as const

/** Data objects the config-driven editor can display — the viewers above, plus
 *  tags that only ever render as read-only context panels. */
export const CUSTOM_OBJECT_TAGS = new Set<string>([...VIEWER_OBJECT_TAGS, "list"])

const standalone = new Set<string>(STANDALONE_CONTROL_TAGS)

function isControlSupported(config: LabelConfig, control: ControlTag): boolean {
  if (control.tag === "relations") return true
  if (!isSpatialControl(control)) return standalone.has(control.tag)
  const target = objectByName(config, control.toName)
  return (
    !!target &&
    (REGION_CONTROLS_BY_OBJECT[target.tag] ?? []).includes(control.tag)
  )
}

/** Can a project with this config be labeled end to end today? */
export function isConfigSupported(config: LabelConfig): boolean {
  if (config.objects.length === 0 || config.controls.length === 0) return false
  // Configs that match a specialized editor (image canvas, text, audio, video,
  // table) are handled natively.
  if (inferModalityTask(config).modality !== "custom") return true
  return (
    config.objects
      .filter((object) => object.value.startsWith("$"))
      .every((object) => CUSTOM_OBJECT_TAGS.has(object.tag)) &&
    config.controls.every((control) => isControlSupported(config, control))
  )
}
