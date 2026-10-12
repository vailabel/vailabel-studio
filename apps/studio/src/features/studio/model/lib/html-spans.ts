// Pure helpers for labeling HTML documents: make imported markup safe to
// render, and paint labeled spans onto it. Spans are addressed by character
// offsets into the document's text (the concatenation of its text nodes, in
// document order), so they survive re-rendering and don't depend on the markup.

import { rgbToRgba } from "@/shared/lib/utils"

export interface HtmlSpan {
  id: string
  start: number
  end: number
  label: string
  color: string
}

// Structural / inline formatting only. Anything not listed is unwrapped (its
// children are kept), except the tags below whose content is dropped outright.
const ALLOWED_TAGS = new Set([
  "a",
  "abbr",
  "article",
  "aside",
  "b",
  "blockquote",
  "br",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "dd",
  "del",
  "details",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "i",
  "img",
  "ins",
  "kbd",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "q",
  "s",
  "section",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
])

const DROPPED_WITH_CONTENT = new Set([
  "script",
  "style",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "noscript",
  "template",
  "svg",
  "math",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "link",
  "meta",
  "base",
  "head",
  "title",
  "audio",
  "video",
  "canvas",
])

// Presentation-neutral attributes. No `style`, no `on*`, no `href` (a click
// must never navigate the app away from the labeling screen).
const ALLOWED_ATTRS = new Set(["title", "lang", "dir", "colspan", "rowspan"])
const SAFE_IMAGE_SRC = /^(https?:|data:image\/(png|jpe?g|gif|webp|avif);)/i

function copySafeAttributes(source: Element, target: Element) {
  for (const { name, value } of Array.from(source.attributes)) {
    if (ALLOWED_ATTRS.has(name.toLowerCase())) target.setAttribute(name, value)
  }
  if (target.tagName === "IMG") {
    const src = source.getAttribute("src") ?? ""
    if (SAFE_IMAGE_SRC.test(src.trim())) target.setAttribute("src", src.trim())
    target.setAttribute("alt", source.getAttribute("alt") ?? "")
  }
}

function cleanInto(source: Node, target: Node, doc: Document) {
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(doc.createTextNode(child.nodeValue ?? ""))
      continue
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue
    const element = child as Element
    const tag = element.tagName.toLowerCase()
    if (DROPPED_WITH_CONTENT.has(tag)) continue
    if (!ALLOWED_TAGS.has(tag)) {
      // Unknown wrapper (custom element, <font>, <center>, …): keep its content.
      cleanInto(element, target, doc)
      continue
    }
    const clean = doc.createElement(tag)
    copySafeAttributes(element, clean)
    cleanInto(element, clean, doc)
    target.appendChild(clean)
  }
}

/**
 * Reduce arbitrary HTML to an allowlist of formatting tags. Scripts, styles,
 * frames, forms, event handlers, inline styles and link targets are removed, so
 * the result is safe to inject. DOMParser never executes what it parses.
 */
export function sanitizeHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html")
  const out = parsed.implementation.createHTMLDocument("")
  cleanInto(parsed.body, out.body, out)
  return out.body.innerHTML
}

/** The text spans are addressed against (for quotes and bounds checks). */
export function htmlToText(cleanHtml: string): string {
  return (
    new DOMParser().parseFromString(cleanHtml, "text/html").body.textContent ??
    ""
  )
}

function textNodes(root: Node): Text[] {
  const walker = root.ownerDocument!.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT
  )
  const nodes: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push(node as Text)
  }
  return nodes
}

/**
 * Wrap each span's characters in `<mark data-span-id>`. A span that crosses
 * element boundaries becomes several marks; only the first carries
 * `data-label`, so the label chip renders once. Marks add no text, so offsets
 * computed against the highlighted markup equal those of the clean markup.
 * Input must already be sanitized.
 */
export function highlightHtml(cleanHtml: string, spans: HtmlSpan[]): string {
  if (spans.length === 0) return cleanHtml
  const doc = new DOMParser().parseFromString(cleanHtml, "text/html")
  const labeled = new Set<string>()
  let offset = 0

  for (const node of textNodes(doc.body)) {
    const text = node.data
    const nodeStart = offset
    const nodeEnd = offset + text.length
    offset = nodeEnd

    const hits = spans.filter(
      (span) => span.start < nodeEnd && span.end > nodeStart
    )
    if (hits.length === 0) continue

    // Cut the node at every span boundary inside it, then mark covered pieces.
    const cuts = new Set([0, text.length])
    for (const span of hits) {
      cuts.add(Math.max(0, span.start - nodeStart))
      cuts.add(Math.min(text.length, span.end - nodeStart))
    }
    const points = [...cuts].sort((a, b) => a - b)
    const fragment = doc.createDocumentFragment()
    for (let index = 0; index < points.length - 1; index++) {
      const from = points[index]
      const to = points[index + 1]
      const piece = doc.createTextNode(text.slice(from, to))
      // Where spans overlap, the shortest (most specific) one wins the paint.
      const owner = hits
        .filter(
          (span) => span.start <= nodeStart + from && span.end >= nodeStart + to
        )
        .sort((a, b) => a.end - a.start - (b.end - b.start))[0]
      if (!owner) {
        fragment.appendChild(piece)
        continue
      }
      const mark = doc.createElement("mark")
      mark.setAttribute("data-span-id", owner.id)
      mark.setAttribute(
        "style",
        `--span-color: ${owner.color}; --span-tint: ${rgbToRgba(owner.color, 0.28)}`
      )
      if (!labeled.has(owner.id)) {
        labeled.add(owner.id)
        mark.setAttribute("data-label", owner.label)
      }
      mark.appendChild(piece)
      fragment.appendChild(mark)
    }
    node.replaceWith(fragment)
  }
  return doc.body.innerHTML
}

/**
 * Character offsets of a DOM range within `container`'s text, or null when the
 * range is collapsed or reaches outside the container.
 */
export function rangeToOffsets(
  container: Node,
  range: Range
): { start: number; end: number } | null {
  if (
    !container.contains(range.startContainer) ||
    !container.contains(range.endContainer)
  ) {
    return null
  }
  const before = range.cloneRange()
  before.selectNodeContents(container)
  before.setEnd(range.startContainer, range.startOffset)
  const start = before.toString().length
  const end = start + range.toString().length
  return end > start ? { start, end } : null
}
