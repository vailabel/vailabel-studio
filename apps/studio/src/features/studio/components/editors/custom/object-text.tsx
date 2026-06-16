import { memo, useMemo } from "react"
import { Loader2 } from "lucide-react"
import type { ImageData, Label } from "@/shared/types/core"
import type { ControlTag } from "@/shared/lib/label-config/types"
import type { StoredResult } from "@/shared/lib/label-config/result"
import type { EntitySpan } from "@/features/studio/model/lib/text-spans"
import { SpanDocument } from "../text/span-document"
import { useDocumentText } from "../text/use-document-text"
import { choicesToLabels, colorForChoice } from "@/shared/lib/label-config/config-helpers"

interface ObjectTextProps {
  doc: ImageData
  /** The span control (Labels) bound to this text object, if any. */
  control?: ControlTag
  spanResults: StoredResult[]
  onCreateSpan: (
    control: ControlTag,
    start: number,
    end: number,
    quote: string,
    label: Label
  ) => void
  onDeleteRegion: (annotationId: string) => void
}

// Text object viewer for the config engine. Reuses the NER span document; spans
// come from / go to the generic result store.
export const ObjectText = memo(
  ({ doc, control, spanResults, onCreateSpan, onDeleteRegion }: ObjectTextProps) => {
    const { text, error } = useDocumentText(doc.path, doc.id)
    const labels = useMemo(
      () => (control ? choicesToLabels(control) : []),
      [control]
    )
    const spans = useMemo<EntitySpan[]>(
      () =>
        spanResults.map((result) => {
          const value = result.value as {
            start: number
            end: number
            text?: string
            labels?: string[]
          }
          const labelName = value.labels?.[0] ?? control?.name ?? ""
          return {
            id: result.id,
            start: value.start,
            end: value.end,
            label: labelName,
            color: control ? colorForChoice(control, labelName) : "#6366f1",
            quote: value.text,
          }
        }),
      [spanResults, control]
    )

    if (error) {
      return <p className="px-6 py-5 text-sm text-destructive">{error}</p>
    }
    if (text == null) {
      return (
        <div className="flex items-center gap-2 px-6 py-5 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading document…
        </div>
      )
    }

    return (
      <SpanDocument
        text={text}
        spans={spans}
        labels={labels}
        interactive={!!control}
        onCreateSpan={(start, end, quote, label) =>
          control && onCreateSpan(control, start, end, quote, label)
        }
        onDeleteSpan={onDeleteRegion}
      />
    )
  }
)

ObjectText.displayName = "ObjectText"
