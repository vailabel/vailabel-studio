import { memo, useCallback, useMemo, useRef, useState } from "react"
import { Loader2, X } from "lucide-react"
import type { Item, Label } from "@/shared/types/core"
import type { ControlTag } from "@/shared/lib/label-config/types"
import {
  hypertextValue,
  labelsValue,
  type StoredResult,
} from "@/shared/lib/label-config/result"
import {
  choicesToLabels,
  colorForChoice,
} from "@/shared/lib/label-config/config-helpers"
import {
  highlightHtml,
  htmlToText,
  rangeToOffsets,
  sanitizeHtml,
  type HtmlSpan,
} from "@/features/studio/model/lib/html-spans"
import { FloatingLabelMenu } from "../text/floating-label-menu"
import { useDocumentText } from "../text/use-document-text"
import { inlineFieldText } from "./field-text"

interface ObjectHyperTextProps {
  doc: Item
  valueKey?: string
  /** The span control (HyperTextLabels / Labels) bound to this object, if any. */
  control?: ControlTag
  spanResults: StoredResult[]
  onCreateRegion: (
    control: ControlTag,
    value: Record<string, unknown>,
    color: string
  ) => void
  onDeleteRegion: (annotationId: string) => void
}

interface PendingSelection {
  start: number
  end: number
  x: number
  y: number
}

// Tailwind's reset flattens headings, lists and tables; restore readable
// document typography for the rendered page, and style the span marks. The
// label chip is a pseudo-element so it never becomes part of the text.
const DOCUMENT_STYLES = [
  "text-sm leading-relaxed",
  "[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-bold",
  "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold",
  "[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-lg [&_h3]:font-semibold",
  "[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3",
  "[&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_code]:font-mono [&_code]:text-xs",
  "[&_table]:my-2 [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
  "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
  "[&_img]:my-2 [&_img]:max-w-full [&_hr]:my-3 [&_hr]:border-border",
  "[&_mark]:rounded-sm [&_mark]:bg-[var(--span-tint)] [&_mark]:text-inherit",
  "[&_mark]:shadow-[inset_0_-2px_0_var(--span-color)]",
  "[&_mark[data-label]]:after:ml-1 [&_mark[data-label]]:after:rounded-sm [&_mark[data-label]]:after:bg-[var(--span-color)]",
  "[&_mark[data-label]]:after:px-1 [&_mark[data-label]]:after:text-[10px] [&_mark[data-label]]:after:font-semibold",
  "[&_mark[data-label]]:after:uppercase [&_mark[data-label]]:after:text-white [&_mark[data-label]]:after:content-[attr(data-label)]",
].join(" ")

// HTML document viewer for the config engine. The page is sanitized, rendered
// as real markup, and — when a span control is bound — labeled by selecting
// text, exactly like the plain-text span editor.
export const ObjectHyperText = memo(
  ({
    doc,
    valueKey,
    control,
    spanResults,
    onCreateRegion,
    onDeleteRegion,
  }: ObjectHyperTextProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [pending, setPending] = useState<PendingSelection | null>(null)
    const { text: source, error } = useDocumentText(
      doc.path,
      doc.id,
      inlineFieldText(doc, valueKey)
    )

    const cleanHtml = useMemo(
      () => (source == null ? null : sanitizeHtml(source)),
      [source]
    )
    const plainText = useMemo(
      () => (cleanHtml == null ? "" : htmlToText(cleanHtml)),
      [cleanHtml]
    )
    const labels = useMemo(
      () => (control ? choicesToLabels(control) : []),
      [control]
    )
    const spans = useMemo<HtmlSpan[]>(
      () =>
        spanResults.map((result) => {
          const value = result.value as Record<string, unknown>
          const label =
            ((value[control?.tag ?? "hypertextlabels"] as
              string[] | undefined) ??
              (value.labels as string[] | undefined))?.[0] ??
            control?.name ??
            ""
          return {
            id: result.id,
            start: Number(value.start) || 0,
            end: Number(value.end) || 0,
            label,
            color: control ? colorForChoice(control, label) : "#6366f1",
          }
        }),
      [spanResults, control]
    )
    const html = useMemo(
      () => (cleanHtml == null ? "" : highlightHtml(cleanHtml, spans)),
      [cleanHtml, spans]
    )

    const onMouseUp = useCallback(
      (event: React.MouseEvent) => {
        if (!control || !containerRef.current) return
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return
        const offsets = rangeToOffsets(
          containerRef.current,
          selection.getRangeAt(0)
        )
        if (!offsets) return
        // Don't label surrounding whitespace picked up by a sloppy drag.
        const raw = plainText.slice(offsets.start, offsets.end)
        const start = offsets.start + (raw.length - raw.trimStart().length)
        const end = offsets.end - (raw.length - raw.trimEnd().length)
        if (end <= start) return
        setPending({ start, end, x: event.clientX, y: event.clientY })
      },
      [control, plainText]
    )

    const pickLabel = useCallback(
      (label: Label) => {
        if (!pending || !control) return
        const quote = plainText.slice(pending.start, pending.end)
        const value =
          control.tag === "labels"
            ? labelsValue(pending.start, pending.end, quote, [label.name])
            : hypertextValue(pending.start, pending.end, quote, [label.name])
        onCreateRegion(control, value, label.color)
        window.getSelection()?.removeAllRanges()
        setPending(null)
      },
      [pending, control, plainText, onCreateRegion]
    )

    if (error) {
      return <p className="px-6 py-5 text-sm text-destructive">{error}</p>
    }
    if (cleanHtml == null) {
      return (
        <div className="flex items-center gap-2 px-6 py-5 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading document…
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
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: span.color }}
                />
                <span className="font-semibold">{span.label}</span>
                <span className="truncate text-muted-foreground">
                  {plainText.slice(span.start, span.end)}
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

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          <div
            ref={containerRef}
            onMouseUp={onMouseUp}
            className={DOCUMENT_STYLES}
            // Sanitized by sanitizeHtml (allowlist) before highlighting.
            dangerouslySetInnerHTML={{ __html: html }}
          />
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

ObjectHyperText.displayName = "ObjectHyperText"
