// Parsers for the structured text fields behind the Paragraphs, Chat and List
// objects. Items carry them as JSON (Label Studio's shapes) — inline on the
// spreadsheet row or in a .json file — and, as a forgiving fallback, as plain
// text with one "Speaker: text" line per utterance / one line per list item.

/** One utterance of a dialogue (Paragraphs) or chat message. */
export interface Utterance {
  author: string
  text: string
}

/** One entry of a List object (e.g. a search result to rank). */
export interface ListEntry {
  id: string
  title: string
  body: string
}

const str = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value)

function parseJson(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return undefined
  try {
    return JSON.parse(trimmed)
  } catch {
    return undefined
  }
}

/** The array inside a JSON field: the value itself, or the first array-valued
 *  property of an object wrapper (`{messages: [...]}`, `{dialogue: [...]}`). */
function jsonArray(text: string): unknown[] | undefined {
  const parsed = parseJson(text)
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === "object") {
    return Object.values(parsed).find(Array.isArray) as unknown[] | undefined
  }
  return undefined
}

const SPEAKER_LINE = /^([^:\n]{1,40}):\s+(.*)$/

/**
 * Utterances of a dialogue / chat field. JSON entries are read with
 * `nameKey` / `textKey` (Label Studio's Paragraphs attrs), falling back to the
 * usual author / role / speaker and text / content keys.
 */
export function parseUtterances(
  text: string,
  nameKey = "author",
  textKey = "text"
): Utterance[] {
  const entries = jsonArray(text)
  if (entries) {
    return entries.map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return { author: "", text: str(entry) }
      }
      const record = entry as Record<string, unknown>
      return {
        author: str(record[nameKey] ?? record.author ?? record.role ?? record.speaker ?? record.name),
        text: str(record[textKey] ?? record.text ?? record.content ?? record.message),
      }
    })
  }
  const utterances: Utterance[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const match = SPEAKER_LINE.exec(line)
    if (match) utterances.push({ author: match[1].trim(), text: match[2] })
    else if (utterances.length > 0) utterances[utterances.length - 1].text += `\n${line}`
    else utterances.push({ author: "", text: line })
  }
  return utterances
}

/** Entries of a List field: JSON objects ({id, title, body}) or strings, or
 *  one non-empty line per entry. Ids default to the 1-based position. */
export function parseListEntries(text: string): ListEntry[] {
  const entries = jsonArray(text)
  if (entries) {
    return entries.map((entry, index) => {
      if (typeof entry !== "object" || entry === null) {
        return { id: String(index + 1), title: str(entry), body: "" }
      }
      const record = entry as Record<string, unknown>
      return {
        id: str(record.id ?? index + 1),
        title: str(record.title ?? record.name ?? record.text ?? `Item ${index + 1}`),
        body: str(record.body ?? record.snippet ?? record.description ?? ""),
      }
    })
  }
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => ({ id: String(index + 1), title: line.trim(), body: "" }))
}

/** A labeled span across utterances: paragraph indexes plus the offsets into
 *  the first and last paragraph's text. */
export interface ParagraphSpan {
  id: string
  start: number
  startOffset: number
  end: number
  endOffset: number
  label: string
  color: string
}

/** A run of an utterance's text, marked when a span covers it. */
export interface TextRun {
  text: string
  span?: ParagraphSpan
}

/** Split utterance `index`'s text into runs, marking the parts covered by
 *  `spans` (a later span wins where spans overlap). */
export function paragraphRuns(
  text: string,
  index: number,
  spans: ParagraphSpan[]
): TextRun[] {
  const covering = spans
    .filter((span) => span.start <= index && index <= span.end)
    .map((span) => ({
      span,
      from: span.start === index ? span.startOffset : 0,
      to: span.end === index ? span.endOffset : text.length,
    }))
    .filter((range) => range.to > range.from)
  if (covering.length === 0) return [{ text }]
  const cuts = new Set([0, text.length])
  for (const range of covering) {
    cuts.add(Math.max(0, range.from))
    cuts.add(Math.min(text.length, range.to))
  }
  const points = [...cuts].sort((a, b) => a - b)
  const runs: TextRun[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const [from, to] = [points[i], points[i + 1]]
    if (to <= from) continue
    const hit = covering.filter((range) => range.from <= from && to <= range.to).pop()
    runs.push({ text: text.slice(from, to), span: hit?.span })
  }
  return runs
}
