import {
  resultsForControl,
  resultsFromAnnotations,
} from "@/shared/lib/label-config/result"
import type { LabelConfig, ObjectTag, ControlTag } from "@/shared/lib/label-config/types"
import type { Annotation } from "@/shared/types/core"
import { colorForChoice, isSpatialControl } from "@/shared/lib/label-config/config-helpers"
import type { RegionInfo, RelationInfo } from "./relations-panel"

const FILE_OBJECT_TAGS = new Set(["image", "text", "audio", "hypertext"])

/** The renderable shape of a parsed config + its current results. */
export interface ConfigLayout {
  /** The interactive viewer object (first file object bound to "$data"). */
  primary: ObjectTag | undefined
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
  const primary = config.objects.find(
    (object) => FILE_OBJECT_TAGS.has(object.tag) && object.value.startsWith("$")
  )
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
    staticObjects,
    standalone,
    relationsControl,
    regionInfos,
    relationInfos,
    spatialControlsFor,
  }
}
