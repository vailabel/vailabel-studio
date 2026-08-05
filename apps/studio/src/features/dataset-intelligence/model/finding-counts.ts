import type {
  ImageQualityReport,
  OutlierReport,
  QualityValidation,
} from "@/shared/types/dataset-intelligence"

/** Total findings across every quality category — drives the tab's counter. */
export function qualityCount(quality: QualityValidation): number {
  return (
    quality.missingLabels.length +
    quality.emptyAnnotations.length +
    quality.invalidPolygons.length +
    quality.corruptedImages.length
  )
}

/** Total image-quality findings — drives the tab's counter. */
export function imageQualityCount(report: ImageQualityReport): number {
  return (
    report.blurry.length +
    report.overexposed.length +
    report.underexposed.length +
    report.lowResolution.length
  )
}

/** Total outlier findings — drives the tab's counter. */
export function outlierCount(outliers: OutlierReport): number {
  return (
    outliers.embeddingOutliers.length +
    outliers.rareClasses.length +
    outliers.suspiciousLabels.length
  )
}
