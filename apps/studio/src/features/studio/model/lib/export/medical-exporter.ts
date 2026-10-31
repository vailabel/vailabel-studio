import type { Annotation, Item } from "@/shared/types/core"
import { resultsFromAnnotations } from "@/shared/lib/label-config/result"
import { seriesOfItem } from "@/shared/lib/dicom/scan"

// Medical (DICOM) projects: one record per series with its UIDs, every region
// grouped under the slice it was drawn on (slice index + SOP Instance UID),
// and the whole-series answers. Region values keep their stored shape — boxes
// and polygons in % of the slice, brush masks as Label Studio RLE with their
// raster size. DICOM-SEG / NIfTI are not produced (they need a binary writer).

export interface MedicalExportSeries {
  item: string
  series: {
    uid: string
    description: string
    modality: string
    rows: number
    columns: number
    sliceCount: number
  } | null
  slices: Array<{
    index: number
    sopInstanceUid: string
    regions: Array<{ id: string; control: string; type: string; value: Record<string, unknown> }>
  }>
  /** Whole-series answers (assessment, report, …), keyed by control name. */
  answers: Record<string, Record<string, unknown>>
}

export function toMedicalSeries(item: Item, annotations: Annotation[]): MedicalExportSeries {
  const series = seriesOfItem(item.data)
  const slices = new Map<number, MedicalExportSeries["slices"][number]>()
  const answers: MedicalExportSeries["answers"] = {}
  for (const result of resultsFromAnnotations(annotations)) {
    const { slice, sopInstanceUid, ...value } = result.value
    if (slice === undefined) {
      answers[result.fromName] = result.value
      continue
    }
    const index = Number(slice) || 0
    const entry = slices.get(index) ?? {
      index,
      sopInstanceUid: String(sopInstanceUid ?? series?.slices[index]?.sopUid ?? ""),
      regions: [],
    }
    entry.regions.push({ id: result.id, control: result.fromName, type: result.resultType, value })
    slices.set(index, entry)
  }
  return {
    item: item.name,
    series: series && {
      uid: series.uid,
      description: series.description,
      modality: series.modality,
      rows: series.rows,
      columns: series.columns,
      sliceCount: series.slices.length,
    },
    slices: [...slices.values()].sort((a, b) => a.index - b.index),
    answers,
  }
}

export const toMedicalJson = (items: Item[], annotationsByItem: Map<string, Annotation[]>) =>
  items.map((item) => toMedicalSeries(item, annotationsByItem.get(item.id) ?? []))
