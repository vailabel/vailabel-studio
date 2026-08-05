import type {
  AnnotationRef,
  ClassCount,
  ImageQualityRef,
  ImageRef,
  OutlierRef,
} from "@/shared/types/dataset-intelligence"

/** One row in an issue list: a primary label plus an optional reason. */
export interface IssueItem {
  primary: string
  secondary?: string
}

export const imageRefToItem = (ref: ImageRef): IssueItem => ({
  primary: ref.name,
  secondary: ref.reason ?? undefined,
})

export const annotationRefToItem = (ref: AnnotationRef): IssueItem => ({
  primary: `${ref.label} · ${ref.imageName}`,
  secondary: ref.reason,
})

export const imageQualityRefToItem = (ref: ImageQualityRef): IssueItem => ({
  primary: ref.name,
  secondary: ref.reason,
})

export const outlierRefToItem = (ref: OutlierRef): IssueItem => ({
  primary: ref.name,
  secondary: ref.reason,
})

export const rareClassToItem = (entry: ClassCount): IssueItem => ({
  primary: entry.label,
  secondary: `${entry.count} annotations · ${entry.percentage.toFixed(1)}%`,
})
