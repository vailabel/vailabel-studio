import type { Annotation } from "@/types/core"

// The generic result envelope (Label Studio shape) that every config-driven
// control produces, stored in `annotation.meta` as kind "result".

export interface StoredResult {
  id: string
  fromName: string
  toName: string
  resultType: string
  value: Record<string, unknown>
}

/** Pull the config-driven results out of an item's annotations. */
export function resultsFromAnnotations(annotations: Annotation[]): StoredResult[] {
  const results: StoredResult[] = []
  for (const annotation of annotations) {
    const meta = annotation.meta
    if (meta?.kind !== "result") continue
    results.push({
      id: annotation.id,
      fromName: meta.fromName,
      toName: meta.toName,
      resultType: meta.resultType,
      value: meta.value,
    })
  }
  return results
}

/** Results for a single control (by its `name`). */
export function resultsForControl(
  annotations: Annotation[],
  controlName: string
): StoredResult[] {
  return resultsFromAnnotations(annotations).filter(
    (result) => result.fromName === controlName
  )
}

/** Build the export-ready Label Studio `result` array for one item. Relations
 *  use Label Studio's top-level {type:"relation", from_id, to_id} shape; every
 *  other control uses the {from_name, to_name, type, value} envelope. */
export function toLabelStudioResults(
  annotations: Annotation[]
): Array<Record<string, unknown>> {
  return resultsFromAnnotations(annotations).map((result) => {
    if (result.resultType === "relation") {
      const value = result.value as {
        from_id?: string
        to_id?: string
        labels?: string[]
      }
      return {
        type: "relation",
        from_id: value.from_id ?? "",
        to_id: value.to_id ?? "",
        labels: value.labels ?? [],
      }
    }
    return {
      id: result.id,
      from_name: result.fromName,
      to_name: result.toName,
      type: result.resultType,
      value: result.value,
    }
  })
}

// ── value builders (the type-specific `value` payloads) ──────────────────────
export const choicesValue = (choices: string[]) => ({ choices })
export const taxonomyValue = (paths: string[]) => ({
  taxonomy: paths.map((path) => [path]),
})
export const textareaValue = (text: string[]) => ({ text })
export const ratingValue = (rating: number) => ({ rating })
export const numberValue = (number: number) => ({ number })
export const labelsValue = (
  start: number,
  end: number,
  text: string,
  labels: string[]
) => ({ start, end, text, labels })
export const rectangleValue = (
  x: number,
  y: number,
  width: number,
  height: number,
  labels: string[],
  rotation = 0
) => ({ x, y, width, height, rotation, rectanglelabels: labels })
export const polygonValue = (
  points: Array<[number, number]>,
  labels: string[]
) => ({ points, polygonlabels: labels })
export const keypointValue = (
  x: number,
  y: number,
  labels: string[],
  width = 0.6
) => ({ x, y, width, keypointlabels: labels })
export const relationValue = (
  fromId: string,
  toId: string,
  labels: string[] = []
) => ({ from_id: fromId, to_id: toId, labels })
