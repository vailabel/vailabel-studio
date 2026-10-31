import type { Label, Prediction } from "@/shared/types/core"

/**
 * Pure helpers behind the labeling palette: picking a distinct color for a new
 * class, ordering classes the way the palette shows them (so 1–9 hotkeys match
 * what the user sees), and matching a freshly drawn shape against the AI's
 * predictions to suggest a class.
 */

/** Distinct, readable class colors (Tailwind 500s), used before falling back to random. */
export const PALETTE_COLORS = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#eab308", // yellow
] as const

const UNCATEGORIZED = "Uncategorized"

/** First palette color no existing class uses yet; cycles once all are taken. */
export function nextPaletteColor(labels: Pick<Label, "color">[]): string {
  const used = new Set(labels.map((label) => label.color?.toLowerCase()))
  const free = PALETTE_COLORS.find((color) => !used.has(color))
  return free ?? PALETTE_COLORS[labels.length % PALETTE_COLORS.length]
}

/** Category a class is grouped under in the palette. */
export function categoryOf(label: Pick<Label, "category">): string {
  return label.category?.trim() || UNCATEGORIZED
}

/**
 * Classes in palette display order: grouped by category (alphabetical,
 * "Uncategorized" last), keeping the original order inside each group. The
 * 1–9 hotkeys index into this list, so the numbers shown in the panel are the
 * keys that actually work.
 */
export function orderLabelsForPalette<T extends Pick<Label, "category">>(
  labels: T[]
): T[] {
  const groups = new Map<string, T[]>()
  for (const label of labels) {
    const category = categoryOf(label)
    const group = groups.get(category)
    if (group) group.push(label)
    else groups.set(category, [label])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === UNCATEGORIZED) return 1
      if (b === UNCATEGORIZED) return -1
      return a.localeCompare(b)
    })
    .flatMap(([, group]) => group)
}

/** Case-insensitive exact-name lookup. */
export function findLabelByName<T extends Pick<Label, "name">>(
  labels: T[],
  name: string
): T | undefined {
  const needle = name.trim().toLowerCase()
  if (!needle) return undefined
  return labels.find((label) => label.name.trim().toLowerCase() === needle)
}

export interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Axis-aligned bounding box of a point list, or null when it has no points. */
export function boundsOf(
  points: Array<{ x: number; y: number }> | undefined
): Box | null {
  if (!Array.isArray(points) || points.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of points) {
    if (typeof point?.x !== "number" || typeof point?.y !== "number") continue
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null
  return { minX, minY, maxX, maxY }
}

/** Intersection-over-union of two boxes (0 when they don't overlap). */
export function iou(a: Box, b: Box): number {
  const ix = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
  const iy = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY))
  const intersection = ix * iy
  if (intersection <= 0) return 0
  const area = (box: Box) => (box.maxX - box.minX) * (box.maxY - box.minY)
  const union = area(a) + area(b) - intersection
  return union > 0 ? intersection / union : 0
}

export interface ClassSuggestion {
  /** Class name the AI proposed. */
  name: string
  /** Existing class with that name, when there is one. */
  label?: Label
  /** Model confidence for the matched prediction (0–1). */
  confidence: number
  color?: string
}

/** Overlap needed before a prediction counts as "the same object". */
const MIN_OVERLAP = 0.3

/**
 * Classes the AI thinks a freshly drawn shape is: every prediction that
 * overlaps the shape enough, best match first, one entry per class name. Lets
 * the class picker offer "AI suggests: car (87%)" as a one-click answer.
 */
export function suggestClassesForShape(
  points: Array<{ x: number; y: number }> | undefined,
  predictions: Prediction[],
  labels: Label[],
  limit = 3
): ClassSuggestion[] {
  const shape = boundsOf(points)
  if (!shape || predictions.length === 0) return []

  const scored = predictions
    .map((prediction) => {
      const box = boundsOf(prediction.coordinates)
      const overlap = box ? iou(shape, box) : 0
      return { prediction, overlap }
    })
    .filter((entry) => entry.overlap >= MIN_OVERLAP)
    .sort(
      (a, b) =>
        b.overlap * (b.prediction.confidence || 0.5) -
        a.overlap * (a.prediction.confidence || 0.5)
    )

  const seen = new Set<string>()
  const suggestions: ClassSuggestion[] = []
  for (const { prediction } of scored) {
    const labelId = prediction.labelId || prediction.label_id
    const byId = labelId
      ? labels.find((label) => label.id === labelId)
      : undefined
    const name =
      byId?.name ||
      prediction.labelName ||
      prediction.label_name ||
      prediction.name
    if (!name) continue
    const key = name.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const label = byId ?? findLabelByName(labels, name)
    suggestions.push({
      name: label?.name ?? name,
      label,
      confidence: prediction.confidence ?? 0,
      color:
        label?.color ||
        prediction.labelColor ||
        prediction.label_color ||
        prediction.color,
    })
    if (suggestions.length >= limit) break
  }
  return suggestions
}
