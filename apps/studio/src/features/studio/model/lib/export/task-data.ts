import type { Annotation, Item } from "@/shared/types/core"
import type { LabelConfig } from "@/shared/lib/label-config/types"
import { resultsFromAnnotations } from "@/shared/lib/label-config/result"

/**
 * An item's task data as the config-driven editor sees it: inline `item.data`
 * (tabular rows, imported tasks) wins; any object tag field it lacks resolves to
 * the item's file, mirroring how the object viewers fall back to the media path.
 * Items with neither keep the legacy `{item: name}` shape.
 */
export function taskData(
  item: Item,
  config?: LabelConfig
): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const object of config?.objects ?? []) {
    if (object.valueKey) data[object.valueKey] = item.path
  }
  Object.assign(data, item.data)
  return Object.keys(data).length > 0 ? data : { item: item.name }
}

/** The native whole-item class annotations (table / classification editors)
 *  surface under this key, shaped like a Choices result. */
export const NATIVE_CLASS_KEY = "label"

/**
 * An item's labels keyed by control name (`fromName`). A control with one result
 * maps to its value (e.g. `{choices: ["good"]}`); several results map to an array
 * of values. Native classification annotations become `label: {choices}`.
 */
export function itemResults(annotations: Annotation[]): Record<string, unknown> {
  const grouped = new Map<string, Array<Record<string, unknown>>>()
  for (const result of resultsFromAnnotations(annotations)) {
    const list = grouped.get(result.fromName)
    if (list) list.push(result.value)
    else grouped.set(result.fromName, [result.value])
  }

  const results: Record<string, unknown> = {}
  for (const [name, values] of grouped) {
    results[name] = values.length === 1 ? values[0] : values
  }

  const classes = annotations
    .filter((annotation) => annotation.type === "classification" && !annotation.meta)
    .map((annotation) => annotation.name)
  if (classes.length > 0 && !(NATIVE_CLASS_KEY in results)) {
    results[NATIVE_CLASS_KEY] = { choices: classes }
  }
  return results
}
