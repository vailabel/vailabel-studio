import type { Annotation, Label } from "@/types/core"

export interface CategoryIndex {
  /** Ordered, de-duplicated category names. */
  names: string[]
  /** 0-based index for YOLO; COCO category ids are `index + 1`. -1 if absent. */
  indexOf: (name: string) => number
}

/**
 * Build a stable category list from the project's declared labels first, then
 * any extra label names found only on annotations. Keeps ids deterministic.
 */
export function buildCategoryIndex(
  labels: Label[],
  annotations: Annotation[]
): CategoryIndex {
  const names: string[] = []
  const seen = new Set<string>()

  const add = (raw: string | undefined) => {
    const name = raw?.trim()
    if (!name || seen.has(name)) return
    seen.add(name)
    names.push(name)
  }

  labels.forEach((label) => add(label.name))
  annotations.forEach((annotation) => add(annotation.name))

  const indexByName = new Map(names.map((name, index) => [name, index]))
  return {
    names,
    indexOf: (name) => indexByName.get(name.trim()) ?? -1,
  }
}
