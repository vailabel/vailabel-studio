import type { Annotation, Item } from "@/shared/types/core"
import type { LabelConfig } from "@/shared/lib/label-config/types"
import { itemResults, taskData } from "./task-data"

/**
 * One JSON line per item: `{id, data, results}`, where `data` is the item's task
 * data and `results` maps each control name to its value. The flat shape suits
 * LLM evaluation / judgement and tabular review pipelines.
 */
export function toResultsJsonl(
  items: Item[],
  annotationsByItem: Map<string, Annotation[]>,
  config?: LabelConfig
): string {
  return items
    .map((item) =>
      JSON.stringify({
        id: item.id,
        data: taskData(item, config),
        results: itemResults(annotationsByItem.get(item.id) || []),
      })
    )
    .join("\n")
}
