import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { FileText, Loader2, Tag, X } from "lucide-react"
import { readTextFile } from "@/lib/desktop"
import { cn, rgbToRgba } from "@/lib/utils"
import {
  annotationsToSpans,
  buildSegments,
  trimRange,
  type EntitySpan,
} from "@/lib/text-spans"
import type { Annotation, ImageData, Label } from "@/types/core"
import type { AnnotationMeta } from "@/types/modality"

interface SpanDraft {
  name: string
  color: string
  type: string
  coordinates: Array<{ x: number; y: number }>
  labelId?: string
  meta?: AnnotationMeta
}

interface TextLabelerProps {
  document: ImageData
  annotations: Annotation[]
  labels: Label[]
  activeLabel: Label | null
  /** NER mode (span selection). False for whole-document text classification. */
  enableSpans: boolean
  onCreateDraft: (draft: SpanDraft) => Promise<void> | void
  onDeleteAnnotation: (annotationId: string) => Promise<void> | void
  onArmLabel: (label: Label) => void
}

interface PendingSelection {
  start: number
  end: number
  quote: string
  /** Viewport coordinates for the floating label menu. */
  x: number
  y: number
}

// Resolve a DOM selection endpoint to an absolute character offset in the
// document. Every rendered slice carries `data-start`; the local text-node
// offset is added to it. Label tags are `user-select:none`, so a selection can
// only ever land inside a text-bearing slice.
function resolveOffset(node: Node | null, offset: number): number | null {
  if (!node) return null
  const element =
    node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
  let current: HTMLElement | null = element
  while (current) {
    const base = current.dataset?.start
    if (base != null) return Number.parseInt(base, 10) + offset
    current = current.parentElement
  }
  return null
}

export const TextLabeler = memo(
  ({
    document: doc,
    annotations,
    labels,
    activeLabel,
    enableSpans,
    onCreateDraft,
    onDeleteAnnotation,
    onArmLabel,
  }: TextLabelerProps) => {
    const [text, setText] = useState<string | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [pending, setPending] = useState<PendingSelection | null>(null)
    const textRef = useRef<HTMLDivElement>(null)

    // Load the document content (referenced in place, read on demand).
    useEffect(() => {
      let cancelled = false
      setText(null)
      setLoadError(null)
      setPending(null)
      readTextFile(doc.path)
        .then((content) => {
          if (cancelled) return
          if (content == null) setLoadError("This document file could not be found.")
          else setText(content)
        })
        .catch((error) => {
          if (cancelled) return
          setLoadError(error instanceof Error ? error.message : String(error))
        })
      return () => {
        cancelled = true
      }
    }, [doc.path, doc.id])

    const spans = useMemo(() => annotationsToSpans(annotations), [annotations])
    const segments = useMemo(
      () => (text == null ? [] : buildSegments(text, spans)),
      [text, spans]
    )

    const clearSelection = useCallback(() => {
      setPending(null)
      window.getSelection()?.removeAllRanges()
    }, [])

    // On mouse-up, turn the browser selection into a pending char range and pop
    // the label menu at the selection (the canonical NER gesture).
    const handleMouseUp = useCallback(() => {
      if (!enableSpans || text == null) return
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setPending(null)
        return
      }
      const rawStart = resolveOffset(selection.anchorNode, selection.anchorOffset)
      const rawEnd = resolveOffset(selection.focusNode, selection.focusOffset)
      if (rawStart == null || rawEnd == null) return

      const trimmed = trimRange(text, rawStart, rawEnd)
      if (!trimmed) {
        setPending(null)
        return
      }
      const rect = selection.getRangeAt(0).getBoundingClientRect()
      setPending({
        start: trimmed.start,
        end: trimmed.end,
        quote: text.slice(trimmed.start, trimmed.end),
        x: rect.left,
        y: rect.bottom + 6,
      })
    }, [enableSpans, text])

    const labelSpan = useCallback(
      async (label: Label) => {
        if (!pending) return
        onArmLabel(label)
        await onCreateDraft({
          name: label.name,
          color: label.color,
          type: "span",
          coordinates: [],
          labelId: label.id,
          meta: {
            kind: "text",
            charStart: pending.start,
            charEnd: pending.end,
            quote: pending.quote,
          },
        })
        clearSelection()
      },
      [pending, onCreateDraft, onArmLabel, clearSelection]
    )

    // Dismiss the floating menu on scroll or an outside click.
    useEffect(() => {
      if (!pending) return
      const onScroll = () => setPending(null)
      const node = textRef.current
      node?.addEventListener("scroll", onScroll)
      return () => node?.removeEventListener("scroll", onScroll)
    }, [pending])

    return (
      <div className="flex h-full flex-col bg-background">
        {/* Document header + active-class hint */}
        <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2 text-sm">
          <FileText className="size-4 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-medium" title={doc.name}>
            {doc.name}
          </span>
          {enableSpans && (
            <span className="text-xs text-muted-foreground">
              Select text to label an entity
            </span>
          )}
        </div>

        {/* Reading / labeling pane */}
        <div
          ref={textRef}
          className="min-h-0 flex-1 overflow-auto px-6 py-5"
          onMouseUp={handleMouseUp}
        >
          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : text == null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading document…
            </div>
          ) : (
            <article
              className={cn(
                "mx-auto max-w-3xl whitespace-pre-wrap break-words font-mono text-[15px] leading-7",
                enableSpans ? "select-text" : "select-text text-foreground"
              )}
            >
              {segments.map((segment) =>
                segment.entity ? (
                  <mark
                    key={segment.start}
                    className="rounded-sm"
                    style={{
                      backgroundColor: rgbToRgba(segment.entity.color, 0.28),
                      boxShadow: `inset 0 -2px 0 ${segment.entity.color}`,
                    }}
                  >
                    <span data-start={segment.start}>{segment.text}</span>
                    {segment.isEntityStart && (
                      <EntityTag
                        span={segment.entity}
                        onDelete={onDeleteAnnotation}
                      />
                    )}
                  </mark>
                ) : (
                  <span key={segment.start} data-start={segment.start}>
                    {segment.text}
                  </span>
                )
              )}
            </article>
          )}
        </div>

        {/* Floating label picker at the selection */}
        {pending && labels.length > 0 && (
          <>
            <div className="fixed inset-0 z-40" onMouseDown={clearSelection} />
            <div
              className="fixed z-50 flex max-w-xs flex-wrap gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-lg"
              style={{ left: pending.x, top: pending.y }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              {labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => void labelSpan(label)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-muted",
                    activeLabel?.id === label.id && "ring-1 ring-primary"
                  )}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Entity list — guarantees every span is manageable (incl. overlaps) */}
        {enableSpans && (
          <EntityList
            spans={spans}
            count={spans.length}
            onDelete={onDeleteAnnotation}
          />
        )}
      </div>
    )
  }
)

TextLabeler.displayName = "TextLabeler"

const EntityTag = memo(
  ({
    span,
    onDelete,
  }: {
    span: EntitySpan
    onDelete: (annotationId: string) => Promise<void> | void
  }) => (
    <span
      contentEditable={false}
      className="mx-0.5 inline-flex select-none items-center gap-0.5 rounded px-1 align-middle text-[10px] font-semibold uppercase leading-none text-white"
      style={{ backgroundColor: span.color }}
    >
      {span.label}
      <button
        type="button"
        onClick={() => void onDelete(span.id)}
        className="rounded-full hover:bg-black/20"
        aria-label={`Remove ${span.label}`}
      >
        <X className="size-2.5" />
      </button>
    </span>
  )
)

EntityTag.displayName = "EntityTag"

const EntityList = memo(
  ({
    spans,
    count,
    onDelete,
  }: {
    spans: EntitySpan[]
    count: number
    onDelete: (annotationId: string) => Promise<void> | void
  }) => (
    <div className="flex max-h-40 shrink-0 flex-col border-t border-border bg-card">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground">
        <Tag className="size-3.5" />
        Entities ({count})
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 py-1">
        {count === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No entities yet.
          </p>
        ) : (
          <ul className="flex flex-col">
            {[...spans]
              .sort((a, b) => a.start - b.start)
              .map((span) => (
                <li
                  key={span.id}
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: span.color }}
                  />
                  <span className="shrink-0 text-xs font-semibold uppercase text-muted-foreground">
                    {span.label}
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate text-muted-foreground"
                    title={span.quote}
                  >
                    {span.quote ?? "—"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void onDelete(span.id)}
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                    aria-label={`Remove ${span.label}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
)

EntityList.displayName = "EntityList"
