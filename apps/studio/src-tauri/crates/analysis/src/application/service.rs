//! The Dataset Intelligence use-case service.

use std::sync::Arc;

use serde_json::Value;
use vailabel_core::DomainResult;

use crate::application::ports::{AnalysisReporter, ImageDecoder};
use crate::contracts::AnalysisRequest;
use crate::domain::engine::{self, PixelOutcome};
use crate::domain::{AnalysisRepository, ImageQualityReport, ImageRef};

/// Emit a progress event at most every this many processed images.
const PROGRESS_EVERY: usize = 25;

/// Application service for Dataset Intelligence.
///
/// Orchestrates the persistence ([`AnalysisRepository`]) and pixel-decode
/// ([`ImageDecoder`]) ports injected by the composition root. The background job
/// lifecycle (threads + the `studio://activity` event) lives in the binary,
/// which drives [`AnalysisAppService::run`] through an [`AnalysisReporter`].
pub struct AnalysisAppService {
    repo: Arc<dyn AnalysisRepository>,
    decoder: Arc<dyn ImageDecoder>,
}

impl AnalysisAppService {
    pub fn new(repo: Arc<dyn AnalysisRepository>, decoder: Arc<dyn ImageDecoder>) -> Self {
        Self { repo, decoder }
    }

    /// Run a full analysis (metadata pass + optional pixel pass + outliers +
    /// assemble + persist), reporting progress through `reporter`. Returns the
    /// persisted report id.
    pub fn run(
        &self,
        request: &AnalysisRequest,
        reporter: &mut dyn AnalysisReporter,
    ) -> DomainResult<String> {
        let cfg = &request.config;
        let project_id = &request.project_id;

        reporter.loading_dataset();
        let images = self.repo.list_images(project_id)?;
        let annotations = self.repo.list_annotations(project_id)?;
        let labels = self.repo.list_labels(project_id)?;

        reporter.analyzing_metadata(images.len());
        let metadata = engine::analyze_metadata(&images, &annotations, &labels, cfg);

        // ── Pixel pass (optional, slow) ─────────────────────────────────────
        let mut image_quality = ImageQualityReport::default();
        let mut corrupted_images: Vec<ImageRef> = Vec::new();
        let mut metrics = Vec::new();

        if cfg.include_image_quality {
            let total = images.len();
            for (index, image) in images.iter().enumerate() {
                let id = image.get("id").and_then(Value::as_str).unwrap_or_default();
                let name = image
                    .get("name")
                    .and_then(Value::as_str)
                    .unwrap_or("Untitled");
                let path = image.get("path").and_then(Value::as_str).unwrap_or_default();

                match self.decoder.analyze_pixels(id, name, path, cfg) {
                    PixelOutcome::Metrics(metric) => {
                        engine::classify_image_quality(&metric, cfg, &mut image_quality);
                        metrics.push(*metric);
                        image_quality.analyzed += 1;
                    }
                    PixelOutcome::Corrupted(reason) => {
                        corrupted_images.push(ImageRef {
                            item_id: id.to_string(),
                            name: name.to_string(),
                            reason: Some(reason),
                        });
                    }
                    PixelOutcome::Unsupported => {
                        image_quality.skipped += 1;
                    }
                }

                if index % PROGRESS_EVERY == 0 || index + 1 == total {
                    reporter.analyzing_images(index + 1, total);
                }
            }
        } else {
            image_quality.skipped = images.len();
        }

        reporter.detecting_outliers();
        let embedding_outliers = engine::embedding_outliers(&metrics, cfg.outlier_z_threshold);

        reporter.saving_report();
        let report = engine::build_report(
            project_id,
            metadata,
            image_quality,
            corrupted_images,
            embedding_outliers,
        );
        self.repo.upsert_report(&report)?;
        Ok(report.id)
    }

    pub fn list_reports(&self, project_id: &str) -> DomainResult<Vec<Value>> {
        self.repo.list_reports(project_id)
    }

    pub fn get_report(&self, id: &str) -> DomainResult<Option<Value>> {
        self.repo.get_report(id)
    }

    pub fn latest_report(&self, project_id: &str) -> DomainResult<Option<Value>> {
        self.repo.latest_report(project_id)
    }

    pub fn delete_report(&self, id: &str) -> DomainResult<()> {
        self.repo.delete_report(id)
    }
}
