import {
  resultsForControl,
  resultsFromAnnotations,
} from "@/shared/lib/label-config/result"
import type { LabelConfig, ObjectTag, ControlTag } from "@/shared/lib/label-config/types"
import type { Annotation } from "@/shared/types/core"
import { colorForChoice, isSpatialControl } from "@/shared/lib/label-config/config-helpers"
import { isMultiTextJudgement, TEXTUAL_OBJECT_TAGS } from "@/shared/lib/label-config/infer"
import type { RegionInfo, RelationInfo } from "./relations-panel"

const FILE_OBJECT_TAGS = new Set(["image", "text", "audio", "hypertext"])

/** The renderable shape of a parsed config + its current results. */
export interface ConfigLayout {
  /** The interactive viewer object (first file object bound to "$data"). */
  primary: ObjectTag | undefined
  /** Read-only data-bound text panels shown above the viewer (prompt + model
   *  responses for LLM-eval tasks, query + candidates for retrieval, …). */
  contextObjects: ObjectTag[]
  /** Literal-value objects rendered as static instruction blocks. */
  staticObjects: ObjectTag[]
  /** Non-spatial, non-relation controls (choices, rating, text input, …). */
  standalone: ControlTag[]
  /** The relations control, if the config declares one. */
  relationsControl: ControlTag | undefined
  /** Every region across spatial controls, flattened for the relations UI. */
  regionInfos: RegionInfo[]
  /** Every stored relation, flattened for the relations UI. */
  relationInfos: RelationInfo[]
  /** Spatial controls (rectangle/polygon/keypoint) bound to a given object. */
  spatialControlsFor: (objectName: string) => ControlTag[]
}

/**
 * Derive everything the config editor renders from the parsed config and the
 * current annotations: which object is the interactive viewer, the static
 * instruction blocks, the standalone controls, and the flattened region/relation
 * lists. Pure — turns config + results into view data.
 */
export function deriveConfigLayout(
  config: LabelConfig,
  annotations: Annotation[]
): ConfigLayout {
  // LLM-eval tasks (≥2 text fields, no span labeling) have no single interactive
  // viewer — every field is a read-only panel — so the primary is suppressed and
  // all text fields become context panels. Other configs keep one interactive
  // primary plus any extra text fields as context (e.g. a question above a doc).
  const judgement = isMultiTextJudgement(config)
  const dataBoundText = config.objects.filter(
    (object) =>
      object.value.startsWith("$") && TEXTUAL_OBJECT_TAGS.has(object.tag)
  )
  const primary = judgement
    ? undefined
    : config.objects.find(
        (object) =>
          FILE_OBJECT_TAGS.has(object.tag) && object.value.startsWith("$")
      )
  const contextObjects = judgement
    ? dataBoundText
    : dataBoundText.filter((object) => object !== primary)
  const staticObjects = config.objects.filter(
    (object) => object !== primary && object.value && !object.value.startsWith("$")
  )
  const spatialControlsFor = (objectName: string) =>
    config.controls.filter(
      (control) => isSpatialControl(control) && control.toName === objectName
    )
  const standalone = config.controls.filter(
    (control) => !isSpatialControl(control) && control.tag !== "relations"
  )
  const relationsControl = config.controls.find(
    (control) => control.tag === "relations"
  )

  const regionInfos: RegionInfo[] = config.controls
    .filter(isSpatialControl)
    .flatMap((control) =>
      resultsForControl(annotations, control.name).map((result) => {
        const name =
          ((result.value as Record<string, unknown>)[control.tag] as
            | string[]
            | undefined)?.[0] ?? control.name
        return {
          id: result.id,
          label: name,
          color: colorForChoice(control, name),
          control: control.name,
        }
      })
    )
  const relationInfos: RelationInfo[] = resultsFromAnnotations(annotations)
    .filter((result) => result.resultType === "relation")
    .map((result) => {
      const value = result.value as { from_id?: string; to_id?: string }
      return {
        id: result.id,
        fromId: value.from_id ?? "",
        toId: value.to_id ?? "",
      }
    })

  return {
    primary,
    contextObjects,
    staticObjects,
    standalone,
    relationsControl,
    regionInfos,
    relationInfos,
    spatialControlsFor,
  }
}
