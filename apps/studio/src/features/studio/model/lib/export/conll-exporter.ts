import type { EntitySpan } from "@/features/studio/model/lib/text-spans"

/** A token with its character offsets in the source document. */
export interface Token {
  text: string
  start: number
  end: number
}

/** A document to export: its text plus the labeled entity spans. */
export interface NerDoc {
  text: string
  spans: Array<Pick<EntitySpan, "start" | "end" | "label">>
}

// Runs of letters/digits/underscore are words; every other non-space character
// (punctuation, symbols) is its own token.
const TOKEN_PATTERN = /[\p{L}\p{N}\p{M}_]+|[^\s\p{L}\p{N}\p{M}_]/gu
const SENTENCE_END = new Set([".", "!", "?"])

/** Split `text` into word/punctuation tokens, keeping character offsets. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const start = match.index
    tokens.push({ text: match[0], start, end: start + match[0].length })
  }
  return tokens
}

/**
 * Drop spans that overlap an earlier one (by start, longest first). BIO tags and
 * spaCy `Doc.ents` both require a flat, non-overlapping entity layer.
 */
export function flatSpans<T extends Pick<EntitySpan, "start" | "end">>(
  spans: T[]
): T[] {
  const sorted = [...spans]
    .filter((span) => span.end > span.start)
    .sort((a, b) => a.start - b.start || b.end - a.end)
  const kept: T[] = []
  let lastEnd = -1
  for (const span of sorted) {
    if (span.start < lastEnd) continue
    kept.push(span)
    lastEnd = span.end
  }
  return kept
}

/** BIO tag per token: a token belongs to the span it overlaps; the first such
 *  token is `B-`, the rest `I-`. */
export function bioTags(tokens: Token[], spans: NerDoc["spans"]): string[] {
  const flat = flatSpans(spans)
  const tags: string[] = []
  let spanIndex = 0
  let previous: (typeof flat)[number] | null = null
  for (const token of tokens) {
    while (spanIndex < flat.length && flat[spanIndex].end <= token.start) {
      spanIndex++
    }
    const span = flat[spanIndex]
    if (span && span.start < token.end && token.start < span.end) {
      tags.push(`${span === previous ? "I" : "B"}-${span.label}`)
      previous = span
    } else {
      tags.push("O")
      previous = null
    }
  }
  return tags
}

/**
 * CoNLL-2003 style NER file (Label Studio's column layout: `token -X- _ TAG`).
 * Each document opens with a `-DOCSTART-` line; sentences are separated by a
 * blank line, breaking at line breaks and after `.`/`!`/`?` outside an entity.
 */
export function toConll(docs: NerDoc[]): string {
  const blocks = docs.map((doc) => {
    const tokens = tokenize(doc.text)
    const tags = bioTags(tokens, doc.spans)
    const lines = ["-DOCSTART- -X- O", ""]
    tokens.forEach((token, index) => {
      const next = tokens[index + 1]
      lines.push(`${token.text} -X- _ ${tags[index]}`)
      if (!next) return
      const lineBreak = doc.text.slice(token.end, next.start).includes("\n")
      const sentenceEnd =
        SENTENCE_END.has(token.text) && !tags[index + 1].startsWith("I-")
      if (lineBreak || sentenceEnd) lines.push("")
    })
    return lines.join("\n")
  })
  return `${blocks.join("\n\n")}\n`
}
