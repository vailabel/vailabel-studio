import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn, rgbToRgba } from "@/shared/lib/utils"
import { buildSegments, trimRange, type EntitySpan } from "@/features/studio/model/lib/text-spans"
import type { Label } from "@/shared/types/core"
import { FloatingLabelMenu } from "./floating-label-menu"

interface SpanDocumentProps {
  text: string
  spans: EntitySpan[]
  labels: Label[]
  activeLabelId?: string | null
  /** Allow creating new spans by selecting text. */
  interactive: boolean
  onCreateSpan?: (start: number, end: number, quote: string, label: Label) => void
  onDeleteSpan?: (annotationId: string) => void
  /** Relation mode: clicking an entity links it (gets click coords). */
  onEntityClick?: (annotationId: string, event: React.MouseEvent) => void
  linkingId?: string | null
}

interface PendingSelection {
  start: number
  end: number
  quote: string
  x: number
  y: number
}

// Resolve a DOM selection endpoint to an absolute character offset. Every slice
// carries `data-start`; the local text-node offset is added. Tags are
// user-select:none, so a selection can only land in a text-bearing slice.
function resolveOffset(node: Node | null, offset: number): number | null {
  if (!node) return null
  let current: HTMLElement | null =
    node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
  while (current) {
    const base = current.dataset?.start
    if (base != null) return Number.parseInt(base, 10) + offset
    current = current.parentElement
  }
  return null
}

export const SpanDocument = memo(
  ({
    text,
    spans,
    labels,
    activeLabelId,
    interactive,
    onCreateSpan,
    onDeleteSpan,
    onEntityClick,
    linkingId,
  }: SpanDocumentProps) => {
    const [pending, setPending] = useState<PendingSelection | null>(null)
    const ref = useRef<HTMLDivElement>(null)

    const segments = useMemo(() => buildSegments(text, spans), [text, spans])

    const clearSelection = useCallback(() => {
      setPending(null)
      window.getSelection()?.removeAllRanges()
    }, [])

    const handleMouseUp = useCallback(() => {
      if (!interactive) return
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
    }, [interactive, text])

    const pick = useCallback(
      (label: Label) => {
        if (pending) onCreateSpan?.(pending.start, pending.end, pending.quote, label)
        clearSelection()
      },
      [pending, onCreateSpan, clearSelection]
    )

    // Dismiss the menu on scroll.
    useEffect(() => {
      if (!pending) return
      const node = ref.current
      const onScroll = () => setPending(null)
      node?.addEventListener("scroll", onScroll)
      return () => node?.removeEventListener("scroll", onScroll)
    }, [pending])

    return (
      <div
        ref={ref}
        className="min-h-0 flex-1 overflow-auto px-6 py-5"
        onMouseUp={handleMouseUp}
      >
        <article className="mx-auto max-w-3xl select-text whitespace-pre-wrap break-words font-mono text-[15px] leading-7">
          {segments.map((segment) =>
            segment.entity ? (
              <mark
                key={segment.start}
                className={cn(
                  "rounded-sm",
                  onEntityClick && "cursor-pointer",
                  linkingId === segment.entity.id && "ring-1 ring-primary"
                )}
                style={{
                  backgroundColor: rgbToRgba(segment.entity.color, 0.28),
                  boxShadow: `inset 0 -2px 0 ${segment.entity.color}`,
                }}
                onClick={
                  onEntityClick
                    ? (event) => onEntityClick(segment.entity!.id, event)
                    : undefined
                }
              >
                <span data-start={segment.start}>{segment.text}</span>
                {segment.isEntityStart && (
                  <span
                    contentEditable={false}
                    className="mx-0.5 inline-flex select-none items-center gap-0.5 rounded px-1 align-middle text-[10px] font-semibold uppercase leading-none text-white"
                    style={{ backgroundColor: segment.entity.color }}
                  >
                    {segment.entity.label}
                    {onDeleteSpan && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDeleteSpan(segment.entity!.id)
                        }}
                        className="rounded-full hover:bg-black/20"
                        aria-label={`Remove ${segment.entity.label}`}
                      >
                        <span aria-hidden>×</span>
                      </button>
                    )}
                  </span>
                )}
              </mark>
            ) : (
              <span key={segment.start} data-start={segment.start}>
                {segment.text}
              </span>
            )
          )}
        </article>

        {pending && (
          <FloatingLabelMenu
            x={pending.x}
            y={pending.y}
            labels={labels}
            activeLabelId={activeLabelId}
            emptyHint="Add a class to label spans."
            onPick={pick}
            onDismiss={clearSelection}
          />
        )}
      </div>
    )
  }
)

SpanDocument.displayName = "SpanDocument"
