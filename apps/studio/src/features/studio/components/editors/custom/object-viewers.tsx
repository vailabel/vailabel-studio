import type { ComponentType } from "react"
import { resultsForControl } from "@/shared/lib/label-config/result"
import type { ControlTag, ObjectTag } from "@/shared/lib/label-config/types"
import type { Annotation, Item, Label } from "@/shared/types/core"
import { ObjectImage } from "./object-image"
import { ObjectText } from "./object-text"
import { ObjectHyperText } from "./object-hypertext"
import { ObjectTimeSeries } from "./object-timeseries"
import { ObjectAudio } from "./object-audio"
import { ObjectPdf, ObjectVideo } from "./object-media"
import { ObjectParagraphs } from "./object-paragraphs"
import { ObjectChat } from "./object-chat"
import { ObjectVideoRegions } from "./object-video-regions"
import { ObjectPdfPages } from "./object-pdf-pages"

/** What every interactive object viewer receives from the editor body. */
export interface ObjectViewerProps {
  object: ObjectTag
  doc: Item
  /** Region controls bound to this object (boxes, spans, time ranges, …). */
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
  /** Replace a stored region's value (tracks gaining keyframes, …). */
  onUpdateRegion: (
    annotationId: string,
    control: ControlTag,
    value: Record<string, unknown>
  ) => void
}

const resultsOf = (annotations: Annotation[], control?: ControlTag) =>
  control ? resultsForControl(annotations, control.name) : []

// One viewer per object tag. Adding a data type to the config-driven editor is
// one viewer component + one entry here (Open/Closed) — and one tag in
// VIEWER_OBJECT_TAGS so the template catalog knows it is supported.
export const OBJECT_VIEWERS: Partial<
  Record<string, ComponentType<ObjectViewerProps>>
> = {
  image: ({ doc, controls, annotations, onCreateRegion, onDeleteRegion }) => (
    <ObjectImage
      doc={doc}
      controls={controls}
      resultsByControl={Object.fromEntries(
        controls.map((control) => [
          control.name,
          resultsOf(annotations, control),
        ])
      )}
      onCreateRegion={onCreateRegion}
      onDeleteRegion={onDeleteRegion}
    />
  ),
  text: ({
    object,
    doc,
    controls,
    annotations,
    onCreateSpan,
    onDeleteRegion,
  }) => (
    <ObjectText
      doc={doc}
      valueKey={object.valueKey}
      control={controls[0]}
      spanResults={resultsOf(annotations, controls[0])}
      onCreateSpan={onCreateSpan}
      onDeleteRegion={onDeleteRegion}
    />
  ),
  hypertext: ({
    object,
    doc,
    controls,
    annotations,
    onCreateRegion,
    onDeleteRegion,
  }) => (
    <ObjectHyperText
      doc={doc}
      valueKey={object.valueKey}
      control={controls[0]}
      spanResults={resultsOf(annotations, controls[0])}
      onCreateRegion={onCreateRegion}
      onDeleteRegion={onDeleteRegion}
    />
  ),
  timeseries: ({
    object,
    doc,
    controls,
    annotations,
    onCreateRegion,
    onDeleteRegion,
  }) => (
    <ObjectTimeSeries
      object={object}
      doc={doc}
      control={controls[0]}
      regionResults={resultsOf(annotations, controls[0])}
      onCreateRegion={onCreateRegion}
      onDeleteRegion={onDeleteRegion}
    />
  ),
  audio: ({ doc, controls, annotations, onCreateRegion, onDeleteRegion }) => (
    <ObjectAudio
      doc={doc}
      control={controls[0]}
      regionResults={resultsOf(annotations, controls[0])}
      onCreateRegion={onCreateRegion}
      onDeleteRegion={onDeleteRegion}
    />
  ),
  video: ({
    object,
    doc,
    controls,
    annotations,
    onCreateRegion,
    onUpdateRegion,
    onDeleteRegion,
  }) =>
    controls.length > 0 ? (
      <ObjectVideoRegions
        object={object}
        doc={doc}
        controls={controls}
        annotations={annotations}
        onCreateRegion={onCreateRegion}
        onUpdateRegion={onUpdateRegion}
        onDeleteRegion={onDeleteRegion}
      />
    ) : (
      <ObjectVideo doc={doc} valueKey={object.valueKey} />
    ),
  pdf: ({ object, doc, controls, annotations, onCreateRegion, onDeleteRegion }) =>
    controls.length > 0 ? (
      <ObjectPdfPages
        object={object}
        doc={doc}
        controls={controls}
        annotations={annotations}
        onCreateRegion={onCreateRegion}
        onDeleteRegion={onDeleteRegion}
      />
    ) : (
      <ObjectPdf doc={doc} valueKey={object.valueKey} />
    ),
  paragraphs: ({
    object,
    doc,
    controls,
    annotations,
    onCreateRegion,
    onDeleteRegion,
  }) => (
    <ObjectParagraphs
      object={object}
      doc={doc}
      control={controls[0]}
      spanResults={resultsOf(annotations, controls[0])}
      onCreateRegion={onCreateRegion}
      onDeleteRegion={onDeleteRegion}
    />
  ),
  chat: ({ object, doc }) => <ObjectChat object={object} doc={doc} />,
}
