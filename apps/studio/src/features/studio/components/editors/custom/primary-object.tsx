import { toAssetUrl } from "@/shared/lib/desktop"
import { resultsForControl } from "@/shared/lib/label-config/result"
import type { ControlTag, ObjectTag } from "@/shared/lib/label-config/types"
import type { Annotation, Item, Label } from "@/shared/types/core"
import { ObjectImage } from "./object-image"
import { ObjectText } from "./object-text"
import { Notice } from "./config-notice"

interface PrimaryObjectProps {
  /** The interactive viewer object, or undefined when the config has no $data object. */
  primary: ObjectTag | undefined
  doc: Item
  /** Spatial controls bound to the primary object. */
  controls: ControlTag[]
  annotations: Annotation[]
  onCreateRegion: (
    control: ControlTag,
    value: Record<string, unknown>,
    color: string
  ) => void
  onCreateSpan: (
    control: ControlTag,
    start: number,
    end: number,
    quote: string,
    label: Label
  ) => void
  onDeleteRegion: (annotationId: string) => void
}

/**
 * Renders the config's primary (interactive) object, dispatching on its tag to
 * the image canvas, text span editor, or audio player. Keeps the editor body
 * free of the per-object-type branching.
 */
export const PrimaryObject = ({
  primary,
  doc,
  controls,
  annotations,
  onCreateRegion,
  onCreateSpan,
  onDeleteRegion,
}: PrimaryObjectProps) => {
  if (!primary) {
    return (
      <Notice icon="info" title="No data object">
        Add an object with a <code>$</code> value (e.g. an Image or Text) to
        display the item.
      </Notice>
    )
  }

  if (primary.tag === "image") {
    return (
      <ObjectImage
        doc={doc}
        controls={controls}
        resultsByControl={Object.fromEntries(
          controls.map((control) => [
            control.name,
            resultsForControl(annotations, control.name),
          ])
        )}
        onCreateRegion={onCreateRegion}
        onDeleteRegion={onDeleteRegion}
      />
    )
  }

  if (primary.tag === "text") {
    return (
      <ObjectText
        doc={doc}
        valueKey={primary.valueKey}
        control={controls[0]}
        spanResults={resultsForControl(annotations, controls[0]?.name ?? "")}
        onCreateSpan={onCreateSpan}
        onDeleteRegion={onDeleteRegion}
      />
    )
  }

  if (primary.tag === "audio") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <audio controls src={toAssetUrl(doc.path)} className="w-full max-w-2xl" />
      </div>
    )
  }

  return (
    <Notice icon="info" title="Unsupported object">
      Object “{primary.tag}” isn’t supported yet.
    </Notice>
  )
}
