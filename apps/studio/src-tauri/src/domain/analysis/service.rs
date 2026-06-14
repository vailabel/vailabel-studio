//! Orchestration for Dataset Intelligence: spins the analysis engine on a
//! background worker thread, streams progress to the UI via the
//! `analysis://progress` event, and persists the finished report to SQLite.
//!
//! The heavy work (decoding 1000+ images) must never block a Tauri command, so
//! [`AnalysisService::start`] returns a job handle immediately and the real
//! work happens in [`run_job`].

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;

use serde_json::Value;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::store::DesktopStore;
use crate::{now_iso, AppError};

use super::engine::{self, MetadataAnalysis, PixelMetrics, PixelOutcome};
use super::model::*;

pub const PROGRESS_EVENT: &str = "analysis://progress";
/// Emit a progress event at most every this many processed images.
const PROGRESS_EVERY: usize = 25;

type JobMap = Arc<Mutex<HashMap<String, AnalysisJob>>>;

#[derive(Clone)]
pub struct AnalysisService {
    store: Arc<Mutex<DesktopStore>>,
    jobs: JobMap,
}

impl AnalysisService {
    pub fn new(store: Arc<Mutex<DesktopStore>>) -> Self {
        Self {
            store,
            jobs: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Queue an analysis and return its job handle. The actual work runs on a
    /// detached worker thread.
    pub fn start(&self, app: &AppHandle, request: AnalysisRequest) -> Result<AnalysisJob, AppError> {
        let job = AnalysisJob::new(Uuid::new_v4().to_string(), request.project_id.clone(), now_iso());
        self.put_job(job.clone());

        let store = self.store.clone();
        let jobs = self.jobs.clone();
        let app = app.clone();
        let job_id = job.job_id.clone();
        thread::spawn(move || run_job(store, jobs, app, request, job_id));

        Ok(job)
    }

    pub fn job(&self, job_id: &str) -> Option<AnalysisJob> {
        self.jobs.lock().ok()?.get(job_id).cloned()
    }

    pub fn list_reports(&self, project_id: &str) -> Result<Vec<Value>, AppError> {
        Ok(self.guard()?.list_analysis_reports(project_id)?)
    }

    pub fn get_report(&self, id: &str) -> Result<Option<Value>, AppError> {
        Ok(self.guard()?.get_analysis_report(id)?)
    }

    pub fn latest_report(&self, project_id: &str) -> Result<Option<Value>, AppError> {
        Ok(self.guard()?.latest_analysis_report(project_id)?)
    }

    pub fn delete_report(&self, id: &str) -> Result<Value, AppError> {
        self.guard()?.delete_analysis_report(id)?;
        Ok(serde_json::json!({ "success": true }))
    }

    fn guard(&self) -> Result<std::sync::MutexGuard<'_, DesktopStore>, AppError> {
        self.store
            .lock()
            .map_err(|_| AppError::Message("Desktop store is unavailable".into()))
    }

    fn put_job(&self, job: AnalysisJob) {
        if let Ok(mut map) = self.jobs.lock() {
            map.insert(job.job_id.clone(), job);
        }
    }
}

// ── Worker ──────────────────────────────────────────────────────────────────

fn run_job(
    store: Arc<Mutex<DesktopStore>>,
    jobs: JobMap,
    app: AppHandle,
    request: AnalysisRequest,
    job_id: String,
) {
    match run_job_inner(&store, &jobs, &app, &request, &job_id) {
        Ok(report_id) => {
            update_job(&jobs, &app, &job_id, |job| {
                job.status = "completed".into();
                job.stage = "Completed".into();
                job.progress = 1.0;
                job.report_id = Some(report_id.clone());
            });
        }
        Err(err) => {
            update_job(&jobs, &app, &job_id, |job| {
                job.status = "failed".into();
                job.stage = "Failed".into();
                job.error = Some(err.to_string());
            });
        }
    }
}

fn run_job_inner(
    store: &Arc<Mutex<DesktopStore>>,
    jobs: &JobMap,
    app: &AppHandle,
    request: &AnalysisRequest,
    job_id: &str,
) -> Result<String, AppError> {
    let cfg = &request.config;
    let project_id = &request.project_id;

    update_job(jobs, app, job_id, |job| {
        job.status = "running".into();
        job.stage = "Loading dataset".into();
    });

    // Snapshot the data under a brief lock, then release before heavy work.
    let (images, annotations, labels) = {
        let guard = store
            .lock()
            .map_err(|_| AppError::Message("Desktop store is unavailable".into()))?;
        (
            guard.list_by_field("images", "project_id", project_id)?,
            guard.list_by_field("annotations", "project_id", project_id)?,
            guard.list_by_field("labels", "project_id", project_id)?,
        )
    };

    update_job(jobs, app, job_id, |job| {
        job.stage = "Analyzing metadata".into();
        job.total = images.len();
        job.progress = 0.05;
    });

    let metadata = engine::analyze_metadata(&images, &annotations, &labels, cfg);

    // ── Pixel pass (optional, slow) ─────────────────────────────────────────
    let mut image_quality = ImageQualityReport::default();
    let mut corrupted_images: Vec<ImageRef> = Vec::new();
    let mut metrics: Vec<PixelMetrics> = Vec::new();

    if cfg.include_image_quality {
        let total = images.len();
        for (index, image) in images.iter().enumerate() {
            let id = image.get("id").and_then(Value::as_str).unwrap_or_default();
            let name = image
                .get("name")
                .and_then(Value::as_str)
                .unwrap_or("Untitled");
            let path = image.get("path").and_then(Value::as_str).unwrap_or_default();

            match engine::analyze_pixels(id, name, path, cfg) {
                PixelOutcome::Metrics(metric) => {
                    classify_image_quality(&metric, cfg, &mut image_quality);
                    metrics.push(*metric);
                    image_quality.analyzed += 1;
                }
                PixelOutcome::Corrupted(reason) => {
                    corrupted_images.push(ImageRef {
                        image_id: id.to_string(),
                        name: name.to_string(),
                        reason: Some(reason),
                    });
                }
                PixelOutcome::Unsupported => {
                    image_quality.skipped += 1;
                }
            }

            if index % PROGRESS_EVERY == 0 || index + 1 == total {
                let processed = index + 1;
                update_job(jobs, app, job_id, |job| {
                    job.processed = processed;
                    job.stage = format!("Analyzing images ({processed}/{total})");
                    // metadata done at 5%, pixel pass spans 5%..90%
                    job.progress = 0.05 + 0.85 * (processed as f64 / total.max(1) as f64);
                });
            }
        }
    } else {
        image_quality.skipped = images.len();
    }

    update_job(jobs, app, job_id, |job| {
        job.stage = "Detecting outliers".into();
        job.progress = 0.92;
    });

    let embedding_outliers = engine::embedding_outliers(&metrics, cfg.outlier_z_threshold);

    // ── Assemble + persist ──────────────────────────────────────────────────
    update_job(jobs, app, job_id, |job| {
        job.stage = "Saving report".into();
        job.progress = 0.97;
    });

    let report = build_report(project_id, metadata, image_quality, corrupted_images, embedding_outliers);
    persist_report(store, &report)?;

    Ok(report.id)
}

fn classify_image_quality(metric: &PixelMetrics, cfg: &AnalysisConfig, report: &mut ImageQualityReport) {
    let make_ref = |reason: String| ImageQualityRef {
        image_id: metric.image_id.clone(),
        name: metric.name.clone(),
        width: metric.width,
        height: metric.height,
        blur_score: metric.blur_score,
        brightness: metric.brightness,
        reason,
    };

    if metric.blur_score < cfg.blur_threshold {
        report
            .blurry
            .push(make_ref(format!("Low sharpness ({:.0})", metric.blur_score)));
    }
    if metric.brightness >= cfg.overexposed_threshold || metric.clip_high > 0.6 {
        report.overexposed.push(make_ref(format!(
            "Bright ({:.0}%, {:.0}% clipped)",
            metric.brightness * 100.0,
            metric.clip_high * 100.0
        )));
    }
    if metric.brightness <= cfg.underexposed_threshold || metric.clip_low > 0.6 {
        report.underexposed.push(make_ref(format!(
            "Dark ({:.0}%, {:.0}% clipped)",
            metric.brightness * 100.0,
            metric.clip_low * 100.0
        )));
    }

    let long_edge = metric.width.max(metric.height) as f64;
    let short_edge = metric.width.min(metric.height).max(1) as f64;
    let aspect = long_edge / short_edge;
    if metric.width < cfg.min_resolution || metric.height < cfg.min_resolution {
        report.low_resolution.push(make_ref(format!(
            "Small ({}×{})",
            metric.width, metric.height
        )));
    } else if aspect > cfg.max_aspect_ratio {
        report
            .low_resolution
            .push(make_ref(format!("Extreme aspect ratio ({aspect:.1}:1)")));
    }
}

fn build_report(
    project_id: &str,
    metadata: MetadataAnalysis,
    image_quality: ImageQualityReport,
    corrupted_images: Vec<ImageRef>,
    embedding_outliers: Vec<OutlierRef>,
) -> AnalysisReport {
    let MetadataAnalysis {
        analytics,
        missing_labels,
        empty_annotations,
        invalid_polygons,
        rare_classes,
        suspicious_labels,
    } = metadata;

    let quality = QualityValidation {
        missing_labels,
        empty_annotations,
        invalid_polygons,
        corrupted_images,
    };
    let outliers = OutlierReport {
        embedding_outliers,
        rare_classes,
        suspicious_labels,
    };

    let findings = collect_findings(&quality, &image_quality, &outliers);
    let health = health_summary(
        &findings,
        analytics.dataset_stats.total_images,
        analytics.dataset_stats.total_annotations,
    );

    AnalysisReport {
        id: Uuid::new_v4().to_string(),
        project_id: project_id.to_string(),
        created_at: now_iso(),
        image_quality_analyzed: image_quality.analyzed > 0 || image_quality.skipped > 0,
        image_count: analytics.dataset_stats.total_images,
        annotation_count: analytics.dataset_stats.total_annotations,
        label_count: analytics.label_distribution.len(),
        health,
        analytics,
        quality,
        image_quality,
        outliers,
        findings,
    }
}

fn collect_findings(
    quality: &QualityValidation,
    image_quality: &ImageQualityReport,
    outliers: &OutlierReport,
) -> Vec<Finding> {
    let mut findings = Vec::new();
    let mut push = |category: &str, kind: &str, severity: &str, message: String, image_id: Option<String>, annotation_id: Option<String>, metric: Option<f64>| {
        findings.push(Finding {
            id: Uuid::new_v4().to_string(),
            category: category.into(),
            kind: kind.into(),
            severity: severity.into(),
            message,
            image_id,
            annotation_id,
            metric,
        });
    };

    for item in &quality.missing_labels {
        push("quality", "missingLabels", "warning", format!("{}: no annotations", item.name), Some(item.image_id.clone()), None, None);
    }
    for item in &quality.empty_annotations {
        push("quality", "emptyAnnotation", "error", format!("{} on {}: {}", item.label, item.image_name, item.reason), Some(item.image_id.clone()), Some(item.annotation_id.clone()), None);
    }
    for item in &quality.invalid_polygons {
        push("quality", "invalidPolygon", "error", format!("{} on {}: {}", item.label, item.image_name, item.reason), Some(item.image_id.clone()), Some(item.annotation_id.clone()), None);
    }
    for item in &quality.corrupted_images {
        push("quality", "corruptedImage", "error", format!("{}: {}", item.name, item.reason.clone().unwrap_or_default()), Some(item.image_id.clone()), None, None);
    }
    for item in &image_quality.blurry {
        push("imageQuality", "blur", "warning", format!("{}: {}", item.name, item.reason), Some(item.image_id.clone()), None, Some(item.blur_score));
    }
    for item in &image_quality.overexposed {
        push("imageQuality", "overexposed", "warning", format!("{}: {}", item.name, item.reason), Some(item.image_id.clone()), None, Some(item.brightness));
    }
    for item in &image_quality.underexposed {
        push("imageQuality", "underexposed", "warning", format!("{}: {}", item.name, item.reason), Some(item.image_id.clone()), None, Some(item.brightness));
    }
    for item in &image_quality.low_resolution {
        push("imageQuality", "lowResolution", "warning", format!("{}: {}", item.name, item.reason), Some(item.image_id.clone()), None, None);
    }
    for item in &outliers.embedding_outliers {
        push("outlier", "embeddingOutlier", "info", format!("{}: {}", item.name, item.reason), Some(item.image_id.clone()), None, Some(item.score));
    }
    for item in &outliers.rare_classes {
        push("outlier", "rareClass", "info", format!("Rare class '{}' ({} annotations)", item.label, item.count), None, None, Some(item.count as f64));
    }
    for item in &outliers.suspicious_labels {
        push("outlier", "suspiciousLabel", "warning", format!("{} on {}: {}", item.label, item.image_name, item.reason), Some(item.image_id.clone()), Some(item.annotation_id.clone()), None);
    }

    findings
}

fn health_summary(findings: &[Finding], image_count: usize, annotation_count: usize) -> HealthSummary {
    let mut errors = 0;
    let mut warnings = 0;
    let mut infos = 0;
    for finding in findings {
        match finding.severity.as_str() {
            "error" => errors += 1,
            "warning" => warnings += 1,
            _ => infos += 1,
        }
    }
    let total_checks = (image_count + annotation_count).max(1) as f64;
    let weighted = errors as f64 + warnings as f64 * 0.5 + infos as f64 * 0.1;
    let score = (100.0 * (1.0 - weighted / total_checks)).clamp(0.0, 100.0);
    HealthSummary {
        errors,
        warnings,
        infos,
        score,
    }
}

fn persist_report(store: &Arc<Mutex<DesktopStore>>, report: &AnalysisReport) -> Result<(), AppError> {
    let summary = ReportSummary {
        id: report.id.clone(),
        project_id: report.project_id.clone(),
        created_at: report.created_at.clone(),
        image_count: report.image_count,
        annotation_count: report.annotation_count,
        health: report.health.clone(),
    };
    let summary_json = serde_json::to_string(&summary)?;
    let report_json = serde_json::to_string(report)?;

    let guard = store
        .lock()
        .map_err(|_| AppError::Message("Desktop store is unavailable".into()))?;
    guard.upsert_analysis_report(
        &report.id,
        &report.project_id,
        &report.created_at,
        &summary_json,
        &report_json,
    )?;
    Ok(())
}

/// Mutate the stored job in place and broadcast the new state to the frontend.
fn update_job<F: FnOnce(&mut AnalysisJob)>(jobs: &JobMap, app: &AppHandle, job_id: &str, mutate: F) {
    let snapshot = {
        let mut map = match jobs.lock() {
            Ok(map) => map,
            Err(_) => return,
        };
        let Some(job) = map.get_mut(job_id) else {
            return;
        };
        mutate(job);
        job.updated_at = now_iso();
        job.clone()
    };
    let _ = app.emit(PROGRESS_EVENT, snapshot);
}
