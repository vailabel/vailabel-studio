import { memo, useCallback, useMemo, useRef, useState } from "react"
import { Loader2, X } from "lucide-react"
import type { Item, Label } from "@/shared/types/core"
import type { ControlTag, ObjectTag } from "@/shared/lib/label-config/types"
import { paragraphLabelsValue, type StoredResult } from "@/shared/lib/label-config/result"
import { choicesToLabels, colorForChoice } from "@/shared/lib/label-config/config-helpers"
import {
  parseUtterances,
  type ParagraphSpan,
} from "@/features/studio/model/lib/structured-fields"
import { FloatingLabelMenu } from "../text/floating-label-menu"
import { useDocumentText } from "../text/use-document-text"
import { inlineFieldText } from "./field-text"
import { DialogueView } from "./dialogue-views"

interface ObjectParagraphsProps {
  object: ObjectTag
  doc: Item
  /** The ParagraphLabels control bound to this object. */
  control?: ControlTag
  spanResults: StoredResult[]
  onCreateRegion: (
    control: ControlTag,
    value: Record<string, unknown>,
    color: string
  ) => void
  onDeleteRegion: (annotationId: string) => void
}

interface Point {
  paragraph: number
  offset: number
}

/** Map a DOM selection boundary to (utterance index, offset in its text). */
function pointOf(root: HTMLElement, node: Node, offset: number): Point | null {
  const element = node instanceof Element ? node : node.parentElement
  const cell = element?.closest<HTMLElement>("[data-paragraph]")
  if (!cell || !root.contains(cell)) return null
  const range = document.createRange()
  range.setStart(cell, 0)
  range.setEnd(node, offset)
  return { paragraph: Number(cell.dataset.paragraph), offset: range.toString().length }
}

// Dialogue viewer (Label Studio's Paragraphs + ParagraphLabels): one row per
// utterance; selecting text — within or across utterances — and picking a
// label stores a span addressed by paragraph index + offsets.
export const ObjectParagraphs = memo(
  ({ object, doc, control, spanResults, onCreateRegion, onDeleteRegion }: ObjectParagraphsProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [pending, setPending] = useState<{ start: Point; end: Point; x: number; y: number } | null>(null)
    const { text, error } = useDocumentText(doc.path, doc.id, inlineFieldText(doc, object.valueKey))
    const utterances = useMemo(
      () => (text == null ? [] : parseUtterances(text, object.attrs.namekey, object.attrs.textkey)),
      [text, object.attrs.namekey, object.attrs.textkey]
    )
    const labels = useMemo(() => (control ? choicesToLabels(control) : []), [control])
    const spans = useMemo<ParagraphSpan[]>(
      () =>
        spanResults.map((result) => {
          const value = result.value as Record<string, unknown>
          const label = (value.paragraphlabels as string[] | undefined)?.[0] ?? control?.name ?? ""
          return {
            id: result.id,
            start: Number(value.start) || 0,
            startOffset: Number(value.startOffset) || 0,
            end: Number(value.end) || 0,
            endOffset: Number(value.endOffset) || 0,
            label,
            color: control ? colorForChoice(control, label) : "#6366f1",
          }
        }),
      [spanResults, control]
    )

    const onMouseUp = useCallback(
      (event: React.MouseEvent) => {
        const root = containerRef.current
        const selection = window.getSelection()
        if (!control || !root || !selection || selection.rangeCount === 0) return
        const range = selection.getRangeAt(0)
        if (range.collapsed) return
        const start = pointOf(root, range.startContainer, range.startOffset)
        const end = pointOf(root, range.endContainer, range.endOffset)
        if (!start || !end) return
        setPending({ start, end, x: event.clientX, y: event.clientY })
      },
      [control]
    )

    const quoteOf = useCallback(
      (start: Point, end: Point) =>
        utterances
          .slice(start.paragraph, end.paragraph + 1)
          .map((utterance, index, all) =>
            utterance.text.slice(
              index === 0 ? start.offset : 0,
              index === all.length - 1 ? end.offset : undefined
            )
          )
          .join("\n"),
      [utterances]
    )

    const pickLabel = useCallback(
      (label: Label) => {
        if (!pending || !control) return
        const { start, end } = pending
        onCreateRegion(
          control,
          paragraphLabelsValue(start.paragraph, start.offset, end.paragraph, end.offset, quoteOf(start, end), [label.name]),
          label.color
        )
        window.getSelection()?.removeAllRanges()
        setPending(null)
      },
      [pending, control, quoteOf, onCreateRegion]
    )

    if (error) return <p className="px-6 py-5 text-sm text-destructive">{error}</p>
    if (text == null) {
      return (
        <div className="flex items-center gap-2 px-6 py-5 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading dialogue…
        </div>
      )
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {spans.length > 0 && (
          <ul className="flex shrink-0 flex-wrap gap-1.5 border-b border-border bg-card px-4 py-2">
            {spans.map((span) => (
              <li
                key={span.id}
                className="inline-flex max-w-xs items-center gap-1.5 rounded-md border border-border px-1.5 py-0.5 text-xs"
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: span.color }} />
                <span className="font-semibold">{span.label}</span>
                <span className="truncate text-muted-foreground">
                  {quoteOf(
                    { paragraph: span.start, offset: span.startOffset },
                    { paragraph: span.end, offset: span.endOffset }
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteRegion(span.id)}
                  aria-label={`Remove ${span.label} span`}
                  className="rounded-full hover:bg-muted"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div ref={containerRef} onMouseUp={onMouseUp} className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {utterances.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">(empty dialogue)</p>
          ) : (
            <DialogueView utterances={utterances} spans={spans} />
          )}
        </div>

        {pending && (
          <FloatingLabelMenu
            x={pending.x}
            y={pending.y}
            labels={labels}
            emptyHint="Add a label to this control."
            onPick={pickLabel}
            onDismiss={() => setPending(null)}
          />
        )}
      </div>
    )
  }
)

ObjectParagraphs.displayName = "ObjectParagraphs"
