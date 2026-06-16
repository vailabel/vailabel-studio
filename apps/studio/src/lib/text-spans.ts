// Pure helpers for the text (NLP) labeling editor. Kept free of React/DOM so the
// span-segmentation and offset math can be unit-tested in isolation. The editor
// component handles the DOM selection; everything below operates on plain data.

import type { Annotation } from "@/types/core"

/** A labeled character range over a document, ready to render/highlight. */
export interface EntitySpan {
  id: string
  start: number
  end: number
  label: string
  color: string
  /** The labeled text, when the annotation recorded it (for list display). */
  quote?: string
}

/** A contiguous slice of the document, optionally colored by one entity. */
export interface TextSegment {
  start: number
  end: number
  text: string
  /** The entity coloring this slice, or null for plain text. */
  entity: EntitySpan | null
  /** True only on the slice where the entity begins (render its tag once). */
  isEntityStart: boolean
}

/** Pull the labeled text spans out of a document's annotations. */
export function annotationsToSpans(annotations: Annotation[]): EntitySpan[] {
  const spans: EntitySpan[] = []
  for (const annotation of annotations) {
    const meta = annotation.meta
    if (!meta || meta.kind !== "text") continue
    if (
      typeof meta.charStart !== "number" ||
      typeof meta.charEnd !== "number" ||
      meta.charEnd <= meta.charStart
    ) {
      continue
    }
    spans.push({
      id: annotation.id,
      start: meta.charStart,
      end: meta.charEnd,
      label: annotation.name,
      color: annotation.color || "#6366f1",
      quote: meta.quote,
    })
  }
  return spans
}

/**
 * Split `text` into contiguous segments at every span boundary. Each elementary
 * interval is colored by the covering span; when intervals overlap, the shortest
 * span wins (so a nested entity stays visible inside a larger one). The returned
 * segments tile the whole document with no gaps or overlaps.
 */
export function buildSegments(text: string, spans: EntitySpan[]): TextSegment[] {
  const length = text.length
  if (length === 0) return []

  // Clamp to the document and drop empty/invalid ranges.
  const valid = spans
    .map((span) => ({
      ...span,
      start: Math.max(0, Math.min(span.start, length)),
      end: Math.max(0, Math.min(span.end, length)),
    }))
    .filter((span) => span.end > span.start)

  if (valid.length === 0) {
    return [{ start: 0, end: length, text, entity: null, isEntityStart: false }]
  }

  // Unique, sorted boundary points.
  const boundaries = new Set<number>([0, length])
  for (const span of valid) {
    boundaries.add(span.start)
    boundaries.add(span.end)
  }
  const points = [...boundaries].sort((a, b) => a - b)

  const segments: TextSegment[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]
    const end = points[i + 1]
    if (end <= start) continue

    // Among spans covering [start, end), the shortest wins; ties break toward
    // the later-added span so a fresh annotation sits on top.
    let chosen: EntitySpan | null = null
    let chosenLen = Infinity
    valid.forEach((span) => {
      if (span.start <= start && span.end >= end) {
        const len = span.end - span.start
        if (len <= chosenLen) {
          chosen = span
          chosenLen = len
        }
      }
    })

    segments.push({
      start,
      end,
      text: text.slice(start, end),
      entity: chosen,
      isEntityStart: chosen !== null && (chosen as EntitySpan).start === start,
    })
  }
  return segments
}

/**
 * Trim leading/trailing whitespace from a raw selection range so labeled spans
 * don't swallow surrounding spaces/newlines. Returns null if nothing is left.
 */
export function trimRange(
  text: string,
  start: number,
  end: number
): { start: number; end: number } | null {
  let s = Math.max(0, Math.min(start, end))
  let e = Math.min(text.length, Math.max(start, end))
  while (s < e && /\s/.test(text[s])) s++
  while (e > s && /\s/.test(text[e - 1])) e--
  return e > s ? { start: s, end: e } : null
}

// ── Export ────────────────────────────────────────────────────────────────
// doccano / Label Studio-style JSONL: one document per line.

export interface TextExportDoc {
  text: string
  /** NER spans as [start, end, label] triples (doccano `label` convention). */
  label: Array<[number, number, string]>
  /** Whole-document classes (text classification). */
  cats: string[]
}

/** Serialize text documents + their spans/classes to JSONL (one doc per line). */
export function toTextJsonl(docs: TextExportDoc[]): string {
  return docs
    .map((doc) =>
      JSON.stringify({ text: doc.text, label: doc.label, cats: doc.cats })
    )
    .join("\n")
}
