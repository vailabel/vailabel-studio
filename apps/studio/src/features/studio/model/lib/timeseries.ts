// Pure helpers for the time-series viewer: parse a CSV / TSV / JSON series into
// numeric channels over a shared time axis, and thin it out for drawing.

export interface TimeSeriesChannel {
  name: string
  values: number[]
  min: number
  max: number
}

export interface TimeSeries {
  /** Numeric time axis: epoch ms for dates, the raw number otherwise, or the
   *  row index when no usable time column exists. */
  time: number[]
  /** True when `time` holds epoch milliseconds parsed from date strings. */
  isDate: boolean
  channels: TimeSeriesChannel[]
}

export interface ParseOptions {
  /** Name of the time column; auto-detected when omitted. */
  timeColumn?: string
  /** Field separator for delimited text; auto-detected when omitted. */
  separator?: string
}

const TIME_COLUMN_NAMES = ["time", "timestamp", "datetime", "date", "t", "ts"]

type Row = Record<string, unknown>

function rowsFromJson(source: string): { headers: string[]; rows: Row[] } {
  const parsed: unknown = JSON.parse(source)
  // [{time, a, b}, …]
  if (Array.isArray(parsed)) {
    const rows = parsed.filter(
      (entry): entry is Row => !!entry && typeof entry === "object"
    )
    return { headers: Object.keys(rows[0] ?? {}), rows }
  }
  // {time: […], a: […], b: […]}
  if (parsed && typeof parsed === "object") {
    const columns = parsed as Record<string, unknown[]>
    const headers = Object.keys(columns).filter((key) =>
      Array.isArray(columns[key])
    )
    const length = Math.max(0, ...headers.map((key) => columns[key].length))
    const rows = Array.from({ length }, (_, index) =>
      Object.fromEntries(headers.map((key) => [key, columns[key][index]]))
    )
    return { headers, rows }
  }
  return { headers: [], rows: [] }
}

function detectSeparator(headerLine: string): string {
  const candidates = [",", "\t", ";", "|"]
  return candidates.reduce((best, candidate) =>
    headerLine.split(candidate).length > headerLine.split(best).length
      ? candidate
      : best
  )
}

function rowsFromDelimited(
  source: string,
  separator?: string
): { headers: string[]; rows: Row[] } {
  const lines = source.split(/\r?\n/).filter((line) => line.trim() !== "")
  if (lines.length === 0) return { headers: [], rows: [] }
  const sep = separator || detectSeparator(lines[0])
  const cells = (line: string) =>
    line.split(sep).map((cell) => cell.trim().replace(/^"(.*)"$/, "$1"))
  const headers = cells(lines[0])
  const rows = lines.slice(1).map((line) => {
    const values = cells(line)
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index]])
    )
  })
  return { headers, rows }
}

const toNumber = (value: unknown): number =>
  typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : Number.NaN

function parseTimeAxis(
  raw: unknown[]
): { time: number[]; isDate: boolean } | null {
  const numeric = raw.map(toNumber)
  if (numeric.every(Number.isFinite)) return { time: numeric, isDate: false }
  // "2026-01-01 12:00:00" is not ISO; WebKit rejects it unless the space is a T.
  const dates = raw.map((value) =>
    Date.parse(
      String(value)
        .trim()
        .replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T")
    )
  )
  if (dates.every(Number.isFinite)) return { time: dates, isDate: true }
  return null
}

/**
 * Parse a series. The time column is `options.timeColumn`, else the first
 * column with a conventional name (time / timestamp / date / …); with neither,
 * rows are indexed 0…n. Every other column with at least one finite number is
 * a channel; unparsable cells become NaN (drawn as gaps).
 */
export function parseTimeSeries(
  source: string,
  options: ParseOptions = {}
): TimeSeries {
  const trimmed = source.trim()
  const { headers, rows } =
    trimmed.startsWith("{") || trimmed.startsWith("[")
      ? rowsFromJson(trimmed)
      : rowsFromDelimited(source, options.separator)

  const wanted = options.timeColumn?.toLowerCase()
  const timeHeader =
    headers.find((header) => header.toLowerCase() === wanted) ??
    headers.find((header) => TIME_COLUMN_NAMES.includes(header.toLowerCase()))
  const axis = timeHeader
    ? parseTimeAxis(rows.map((row) => row[timeHeader]))
    : null

  const channels: TimeSeriesChannel[] = []
  for (const header of headers) {
    if (axis && header === timeHeader) continue
    const values = rows.map((row) => toNumber(row[header]))
    const finite = values.filter(Number.isFinite)
    if (finite.length === 0) continue
    channels.push({
      name: header,
      values,
      min: Math.min(...finite),
      max: Math.max(...finite),
    })
  }

  return {
    time: axis?.time ?? rows.map((_, index) => index),
    isDate: axis?.isDate ?? false,
    channels,
  }
}

/**
 * Indices to draw so a long series stays cheap: each bucket contributes its
 * minimum and maximum, which preserves spikes that plain striding would skip.
 */
export function decimateIndices(values: number[], maxPoints: number): number[] {
  if (values.length <= maxPoints) return values.map((_, index) => index)
  const buckets = Math.max(1, Math.floor(maxPoints / 2))
  const size = values.length / buckets
  const picked: number[] = []
  for (let bucket = 0; bucket < buckets; bucket++) {
    const from = Math.floor(bucket * size)
    const to = Math.min(values.length, Math.floor((bucket + 1) * size))
    let low = -1
    let high = -1
    for (let index = from; index < to; index++) {
      const value = values[index]
      if (!Number.isFinite(value)) continue
      if (low < 0 || value < values[low]) low = index
      if (high < 0 || value > values[high]) high = index
    }
    if (low < 0) continue
    if (low === high) picked.push(low)
    else picked.push(Math.min(low, high), Math.max(low, high))
  }
  return picked
}

/** Axis label for a time value. */
export function formatTime(value: number, isDate: boolean, spanMs = 0): string {
  if (!isDate) return Number.isInteger(value) ? String(value) : value.toFixed(2)
  const date = new Date(value)
  // Under two days of data: the time of day matters more than the date.
  return spanMs > 0 && spanMs < 2 * 86_400_000
    ? date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : date.toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
}
