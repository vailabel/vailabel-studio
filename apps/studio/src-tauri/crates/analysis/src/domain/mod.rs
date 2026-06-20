//! The analysis report domain model: the persisted [`AnalysisReport`], its
//! sub-reports (health, analytics, quality, image-quality, outliers, findings),
//! the lighter [`ReportSummary`], the tunable [`AnalysisConfig`], and the
//! background [`AnalysisJob`] progress envelope. All serialize `camelCase` to
//! match the frontend `types/core.ts`.

use serde::{Deserialize, Serialize};
use vailabel_core::Identifiable;

pub mod engine;
pub mod repository;

pub use repository::AnalysisRepository;

// ── Configuration ───────────────────────────────────────────────────────────

/// Tunable thresholds for the analysis. All optional — the `default` fills in
/// defaults so the frontend can send a partial object (or nothing).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AnalysisConfig {
    /// Decode every image to compute blur/exposure/embedding metrics. This is
    /// the slow part (one decode per image), so it can be turned off for a fast
    /// metadata-only pass.
    pub include_image_quality: bool,
    /// Variance-of-Laplacian below this is considered blurry.
    pub blur_threshold: f64,
    /// Mean luminance (0..1) at/above this is overexposed.
    pub overexposed_threshold: f64,
    /// Mean luminance (0..1) at/below this is underexposed.
    pub underexposed_threshold: f64,
    /// Images with width or height below this (px) are flagged low-resolution.
    pub min_resolution: u32,
    /// Aspect ratios outside `[1/max, max]` are flagged as extreme.
    pub max_aspect_ratio: f64,
    /// Classes whose annotation count is at/below this are "rare".
    pub rare_class_threshold: usize,
    /// A box smaller than this fraction of the image area is "suspicious".
    pub suspicious_area_fraction: f64,
    /// Standardized-distance z-score above which an image is an embedding outlier.
    pub outlier_z_threshold: f64,
}

impl Default for AnalysisConfig {
    fn default() -> Self {
        Self {
            include_image_quality: true,
            blur_threshold: 100.0,
            overexposed_threshold: 0.82,
            underexposed_threshold: 0.18,
            min_resolution: 32,
            max_aspect_ratio: 4.0,
            rare_class_threshold: 3,
            suspicious_area_fraction: 0.0008,
            outlier_z_threshold: 3.0,
        }
    }
}

// ── Background job ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisJob {
    pub job_id: String,
    pub project_id: String,
    /// `queued` | `running` | `completed` | `failed`
    pub status: String,
    /// Human-readable current step, e.g. "Decoding images (412/1047)".
    pub stage: String,
    /// 0.0..1.0
    pub progress: f64,
    pub processed: usize,
    pub total: usize,
    /// Set when `status == "completed"`.
    pub report_id: Option<String>,
    /// Set when `status == "failed"`.
    pub error: Option<String>,
    pub started_at: String,
    pub updated_at: String,
}

impl AnalysisJob {
    pub fn new(job_id: String, project_id: String, now: String) -> Self {
        Self {
            job_id,
            project_id,
            status: "queued".into(),
            stage: "Queued".into(),
            progress: 0.0,
            processed: 0,
            total: 0,
            report_id: None,
            error: None,
            started_at: now.clone(),
            updated_at: now,
        }
    }
}

// ── Report (top level) ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisReport {
    pub id: String,
    pub project_id: String,
    pub created_at: String,
    /// Whether image pixels were decoded for this run.
    pub image_quality_analyzed: bool,
    #[serde(alias = "imageCount")]
    pub item_count: usize,
    pub annotation_count: usize,
    pub label_count: usize,
    /// Roll-up severity counts across every finding.
    pub health: HealthSummary,
    pub analytics: DatasetAnalytics,
    pub quality: QualityValidation,
    pub image_quality: ImageQualityReport,
    pub outliers: OutlierReport,
    /// Flattened, sortable list of every individual issue.
    pub findings: Vec<Finding>,
}

impl Identifiable for AnalysisReport {
    fn id(&self) -> &str {
        &self.id
    }
}

/// Compact row returned by the "list reports" command.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportSummary {
    pub id: String,
    pub project_id: String,
    pub created_at: String,
    #[serde(alias = "imageCount")]
    pub item_count: usize,
    pub annotation_count: usize,
    pub health: HealthSummary,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthSummary {
    pub errors: usize,
    pub warnings: usize,
    pub infos: usize,
    /// 0..100 — 100 means no findings; degrades with weighted issues.
    pub score: f64,
}

// ── Dataset analytics ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatasetAnalytics {
    pub class_distribution: Vec<ClassCount>,
    pub label_distribution: Vec<LabelUsage>,
    pub resolution_stats: ResolutionStats,
    pub dataset_stats: DatasetStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassCount {
    pub label: String,
    pub color: Option<String>,
    pub count: usize,
    /// Share of all annotations, 0..100.
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LabelUsage {
    pub id: String,
    pub name: String,
    pub color: String,
    pub annotation_count: usize,
    #[serde(alias = "imageCount")]
    pub item_count: usize,
    pub used: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolutionStats {
    pub min_width: u32,
    pub max_width: u32,
    pub min_height: u32,
    pub max_height: u32,
    pub mean_width: f64,
    pub mean_height: f64,
    pub median_width: u32,
    pub median_height: u32,
    pub megapixels_mean: f64,
    pub common_resolutions: Vec<ResolutionCount>,
    pub aspect_buckets: Vec<AspectBucket>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolutionCount {
    pub width: u32,
    pub height: u32,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AspectBucket {
    /// e.g. "1:1", "4:3", "16:9", "3:4", "other"
    pub ratio: String,
    pub count: usize,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatasetStats {
    #[serde(alias = "totalImages")]
    pub total_items: usize,
    pub annotated_images: usize,
    pub unannotated_images: usize,
    pub total_annotations: usize,
    pub mean_annotations_per_image: f64,
    pub median_annotations_per_image: f64,
    pub max_annotations_per_image: usize,
    pub annotated_percentage: f64,
    pub annotation_types: Vec<TypeCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypeCount {
    #[serde(rename = "type")]
    pub kind: String,
    pub count: usize,
}

// ── Quality validation ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QualityValidation {
    pub missing_labels: Vec<ImageRef>,
    pub empty_annotations: Vec<AnnotationRef>,
    pub invalid_polygons: Vec<AnnotationRef>,
    pub corrupted_images: Vec<ImageRef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageRef {
    pub item_id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnnotationRef {
    pub annotation_id: String,
    pub item_id: String,
    pub image_name: String,
    pub label: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub reason: String,
}

// ── Image quality ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageQualityReport {
    pub analyzed: usize,
    pub skipped: usize,
    pub blurry: Vec<ImageQualityRef>,
    pub overexposed: Vec<ImageQualityRef>,
    pub underexposed: Vec<ImageQualityRef>,
    pub low_resolution: Vec<ImageQualityRef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageQualityRef {
    pub item_id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    /// Variance of Laplacian (sharpness); higher is sharper.
    pub blur_score: f64,
    /// Mean luminance 0..1.
    pub brightness: f64,
    pub reason: String,
}

// ── Outliers ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutlierReport {
    pub embedding_outliers: Vec<OutlierRef>,
    pub rare_classes: Vec<ClassCount>,
    pub suspicious_labels: Vec<AnnotationRef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutlierRef {
    pub item_id: String,
    pub name: String,
    /// Standardized distance from the dataset feature centroid (z-score units).
    pub score: f64,
    pub reason: String,
}

// ── Unified findings ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Finding {
    pub id: String,
    /// `analytics` | `quality` | `imageQuality` | `outlier`
    pub category: String,
    /// machine key, e.g. `missingLabels`, `blur`, `rareClass`
    pub kind: String,
    /// `error` | `warning` | `info`
    pub severity: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub annotation_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metric: Option<f64>,
}
