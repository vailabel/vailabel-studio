// Dataset Intelligence (Phase 2) — frontend mirror of the Rust
// `domain::analysis::model` types. Field names are camelCase to match the
// backend's `#[serde(rename_all = "camelCase")]`.

export interface AnalysisConfig {
  includeImageQuality?: boolean
  blurThreshold?: number
  overexposedThreshold?: number
  underexposedThreshold?: number
  minResolution?: number
  maxAspectRatio?: number
  rareClassThreshold?: number
  suspiciousAreaFraction?: number
  outlierZThreshold?: number
}

export interface AnalysisJob {
  jobId: string
  projectId: string
  status: "queued" | "running" | "completed" | "failed"
  stage: string
  progress: number
  processed: number
  total: number
  reportId: string | null
  error: string | null
  startedAt: string
  updatedAt: string
}

export interface HealthSummary {
  errors: number
  warnings: number
  infos: number
  score: number
}

export interface ClassCount {
  label: string
  color: string | null
  count: number
  percentage: number
}

export interface LabelUsage {
  id: string
  name: string
  color: string
  annotationCount: number
  imageCount: number
  used: boolean
}

export interface ResolutionCount {
  width: number
  height: number
  count: number
}

export interface AspectBucket {
  ratio: string
  count: number
}

export interface ResolutionStats {
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
  meanWidth: number
  meanHeight: number
  medianWidth: number
  medianHeight: number
  megapixelsMean: number
  commonResolutions: ResolutionCount[]
  aspectBuckets: AspectBucket[]
}

export interface TypeCount {
  type: string
  count: number
}

export interface DatasetStats {
  totalImages: number
  annotatedImages: number
  unannotatedImages: number
  totalAnnotations: number
  meanAnnotationsPerImage: number
  medianAnnotationsPerImage: number
  maxAnnotationsPerImage: number
  annotatedPercentage: number
  annotationTypes: TypeCount[]
}

export interface DatasetAnalytics {
  classDistribution: ClassCount[]
  labelDistribution: LabelUsage[]
  resolutionStats: ResolutionStats
  datasetStats: DatasetStats
}

export interface ImageRef {
  imageId: string
  name: string
  reason?: string | null
}

export interface AnnotationRef {
  annotationId: string
  imageId: string
  imageName: string
  label: string
  type: string
  reason: string
}

export interface QualityValidation {
  missingLabels: ImageRef[]
  emptyAnnotations: AnnotationRef[]
  invalidPolygons: AnnotationRef[]
  corruptedImages: ImageRef[]
}

export interface ImageQualityRef {
  imageId: string
  name: string
  width: number
  height: number
  blurScore: number
  brightness: number
  reason: string
}

export interface ImageQualityReport {
  analyzed: number
  skipped: number
  blurry: ImageQualityRef[]
  overexposed: ImageQualityRef[]
  underexposed: ImageQualityRef[]
  lowResolution: ImageQualityRef[]
}

export interface OutlierRef {
  imageId: string
  name: string
  score: number
  reason: string
}

export interface OutlierReport {
  embeddingOutliers: OutlierRef[]
  rareClasses: ClassCount[]
  suspiciousLabels: AnnotationRef[]
}

export type FindingSeverity = "error" | "warning" | "info"

export interface Finding {
  id: string
  category: "analytics" | "quality" | "imageQuality" | "outlier"
  kind: string
  severity: FindingSeverity
  message: string
  imageId?: string | null
  annotationId?: string | null
  metric?: number | null
}

export interface AnalysisReport {
  id: string
  projectId: string
  createdAt: string
  imageQualityAnalyzed: boolean
  imageCount: number
  annotationCount: number
  labelCount: number
  health: HealthSummary
  analytics: DatasetAnalytics
  quality: QualityValidation
  imageQuality: ImageQualityReport
  outliers: OutlierReport
  findings: Finding[]
}

export interface ReportSummary {
  id: string
  projectId: string
  createdAt: string
  imageCount: number
  annotationCount: number
  health: HealthSummary
}
