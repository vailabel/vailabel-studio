import type { Annotation, Item } from "@/shared/types/core"
import type { LabelConfig } from "@/shared/lib/label-config/types"
import { itemResults, NATIVE_CLASS_KEY } from "./task-data"

/** RFC 4180 field: quote when it holds a comma, quote or line break. */
export function csvField(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const isPrimitive = (value: unknown) =>
  value === null || ["string", "number", "boolean"].includes(typeof value)

/** Flatten a result value to a cell: a single-key payload of primitives
 *  (`{choices: [...]}`, `{rating: 4}`, `{text: [...]}`) becomes its values joined
 *  by `;`; anything richer (regions, several results) stays JSON. */
export function resultCell(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value
  const entries = Object.values(value)
  if (entries.length !== 1) return value
  const [inner] = entries
  if (isPrimitive(inner)) return inner
  if (Array.isArray(inner) && inner.every(isPrimitive)) return inner.join(";")
  return value
}

/**
 * `labels.csv`: one row per item with its `item.data` columns (first-seen order)
 * followed by one column per label control (config order, then any extra). A
 * label column that collides with a data column is suffixed `_label`.
 */
export function toCsv(
  items: Item[],
  annotationsByItem: Map<string, Annotation[]>,
  config?: LabelConfig
): string {
  const dataColumns: string[] = []
  const seenData = new Set<string>()
  for (const item of items) {
    for (const key of Object.keys(item.data ?? {})) {
      if (seenData.has(key)) continue
      seenData.add(key)
      dataColumns.push(key)
    }
  }

  const resultsByItem = items.map((item) =>
    itemResults(annotationsByItem.get(item.id) || [])
  )
  const labelKeys: string[] = []
  const addLabelKey = (key: string) => {
    if (!labelKeys.includes(key)) labelKeys.push(key)
  }
  config?.controls.forEach((control) => addLabelKey(control.name))
  if (!config?.controls.length) addLabelKey(NATIVE_CLASS_KEY)
  resultsByItem.forEach((results) => Object.keys(results).forEach(addLabelKey))

  const labelHeader = labelKeys.map((key) =>
    seenData.has(key) ? `${key}_label` : key
  )
  const lines = [[...dataColumns, ...labelHeader].map(csvField).join(",")]
  items.forEach((item, index) => {
    const results = resultsByItem[index]
    lines.push(
      [
        ...dataColumns.map((key) => item.data?.[key]),
        ...labelKeys.map((key) => resultCell(results[key])),
      ]
        .map(csvField)
        .join(",")
    )
  })
  return `${lines.join("\n")}\n`
}
