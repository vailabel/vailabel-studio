//! Ports the analysis use case depends on. The composition root implements the
//! decoder over the `image` crate and the reporter over the Tauri event channel;
//! the application layer stays unaware of both.

use crate::domain::engine::PixelOutcome;
use crate::domain::AnalysisConfig;

/// Decode one image's pixels into quality/embedding metrics. The infrastructure
/// implementation reads the file; the use case never sees `image` or `std::fs`.
pub trait ImageDecoder: Send + Sync {
    fn analyze_pixels(
        &self,
        item_id: &str,
        name: &str,
        path: &str,
        cfg: &AnalysisConfig,
    ) -> PixelOutcome;
}

/// Receives analysis progress so the binary can stream it over
/// `studio://activity`. The methods mark the run's phases (the binary applies
/// the exact job-state mutations + emits). Implemented at the composition root.
pub trait AnalysisReporter {
    /// Dataset load has begun.
    fn loading_dataset(&mut self);

    /// The metadata pass is starting; `total` images will be processed.
    fn analyzing_metadata(&mut self, total: usize);

    /// Pixel-pass progress: `processed` of `total` images decoded.
    fn analyzing_images(&mut self, processed: usize, total: usize);

    /// The embedding-outlier pass is starting.
    fn detecting_outliers(&mut self);

    /// The finished report is being persisted.
    fn saving_report(&mut self);
}
