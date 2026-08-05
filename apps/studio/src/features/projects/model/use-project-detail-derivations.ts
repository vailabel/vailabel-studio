import { useMemo } from "react"
import type { Annotation, Item, Label } from "@/shared/types/core"
import { getLastItem } from "@/shared/lib/last-item"

/**
 * Values the detail screen derives from the loaded project data. Kept out of
 * the component so the memo dependencies stay readable and testable.
 */
export function useProjectDetailDerivations({
  projectId,
  items,
  annotations,
  labels,
}: {
  projectId: string | undefined
  items: Item[]
  annotations: Annotation[]
  labels: Label[]
}) {
  const annotatedItemIds = useMemo(
    () =>
      new Set(
        annotations
          .map((annotation) => annotation.item_id ?? annotation.itemId)
          .filter(Boolean) as string[]
      ),
    [annotations]
  )

  // "Continue labeling" resumes where the user left off (the remembered item),
  // falling back to the first still-unlabeled item, then the first item.
  const nextItemId = useMemo(() => {
    const saved = getLastItem(projectId)
    if (saved) return saved
    const next = items.find((item) => !annotatedItemIds.has(item.id))
    return (next ?? items[0])?.id
  }, [items, annotatedItemIds, projectId])

  // Annotation count per class, for the distribution view.
  const labelCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const annotation of annotations) {
      const id = annotation.label_id ?? annotation.labelId
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return counts
  }, [annotations])

  const maxLabelCount = useMemo(
    () => Math.max(1, ...labels.map((label) => labelCounts.get(label.id) ?? 0)),
    [labels, labelCounts]
  )

  return { annotatedItemIds, nextItemId, labelCounts, maxLabelCount }
}

/** Call-to-action wording for the primary labeling button. */
export function labelingCtaLabel(progress: number, annotatedItems: number): string {
  if (progress >= 100) return "Review images"
  return annotatedItems > 0 ? "Continue labeling" : "Start labeling"
}
