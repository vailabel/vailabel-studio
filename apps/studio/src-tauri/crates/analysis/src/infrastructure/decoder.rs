//! The pixel decoder — the only place that reads image files.
//!
//! Decodes a single image, downsamples it, and derives blur/exposure/embedding
//! features. Implements the [`ImageDecoder`] port so the application layer stays
//! free of the `image` crate and filesystem access.

use std::path::Path;

use image::GenericImageView;

use crate::application::ports::ImageDecoder;
use crate::domain::engine::{PixelMetrics, PixelOutcome};
use crate::domain::AnalysisConfig;

const SUPPORTED_DECODE_EXT: &[&str] = &["jpg", "jpeg", "png", "gif"];
/// Longest edge an image is downscaled to before computing pixel metrics.
const THUMB_EDGE: u32 = 256;

/// The `image`-crate implementation of the pixel-decode port.
#[derive(Debug, Default, Clone, Copy)]
pub struct ImageQualityDecoder;

impl ImageQualityDecoder {
    pub fn new() -> Self {
        Self
    }
}

impl ImageDecoder for ImageQualityDecoder {
    fn analyze_pixels(
        &self,
        image_id: &str,
        name: &str,
        path: &str,
        cfg: &AnalysisConfig,
    ) -> PixelOutcome {
        analyze_pixels(image_id, name, path, cfg)
    }
}

fn analyze_pixels(image_id: &str, name: &str, path: &str, _cfg: &AnalysisConfig) -> PixelOutcome {
    let file = Path::new(path);
    let ext = file
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    if path.is_empty() || !file.exists() {
        return PixelOutcome::Corrupted("File not found".into());
    }
    if !SUPPORTED_DECODE_EXT.contains(&ext.as_str()) {
        return PixelOutcome::Unsupported;
    }

    let img = match image::open(file) {
        Ok(img) => img,
        Err(err) => return PixelOutcome::Corrupted(format!("Decode failed: {err}")),
    };
    let (width, height) = img.dimensions();
    if width == 0 || height == 0 {
        return PixelOutcome::Corrupted("Zero-sized image".into());
    }

    let thumb = img.thumbnail(THUMB_EDGE, THUMB_EDGE);
    let luma = thumb.to_luma8();
    let rgb = thumb.to_rgb8();

    let (brightness, contrast, clip_high, clip_low) = luma_stats(&luma);
    let blur_score = variance_of_laplacian(&luma);
    let (mean_r, mean_g, mean_b) = rgb_means(&rgb);

    let aspect = width as f64 / height as f64;
    let megapixels = (width as f64 * height as f64) / 1_000_000.0;
    let features = vec![
        mean_r,
        mean_g,
        mean_b,
        brightness,
        contrast,
        (blur_score + 1.0).ln(),
        aspect.ln(),
        (megapixels + 0.001).ln(),
    ];

    PixelOutcome::Metrics(Box::new(PixelMetrics {
        image_id: image_id.to_string(),
        name: name.to_string(),
        width,
        height,
        blur_score,
        brightness,
        clip_high,
        clip_low,
        features,
    }))
}

/// Returns (mean brightness 0..1, contrast/stddev 0..1, clip-high frac, clip-low frac).
fn luma_stats(luma: &image::GrayImage) -> (f64, f64, f64, f64) {
    let pixels = luma.as_raw();
    if pixels.is_empty() {
        return (0.0, 0.0, 0.0, 0.0);
    }
    let n = pixels.len() as f64;
    let mut sum = 0.0;
    let mut sum_sq = 0.0;
    let mut high = 0usize;
    let mut low = 0usize;
    for &p in pixels {
        let v = p as f64;
        sum += v;
        sum_sq += v * v;
        if p >= 250 {
            high += 1;
        }
        if p <= 5 {
            low += 1;
        }
    }
    let mean = sum / n;
    let variance = (sum_sq / n - mean * mean).max(0.0);
    (
        mean / 255.0,
        variance.sqrt() / 255.0,
        high as f64 / n,
        low as f64 / n,
    )
}

/// Variance of the Laplacian — the classic sharpness/blur metric.
fn variance_of_laplacian(luma: &image::GrayImage) -> f64 {
    let (w, h) = luma.dimensions();
    if w < 3 || h < 3 {
        return 0.0;
    }
    let at = |x: u32, y: u32| luma.get_pixel(x, y)[0] as f64;
    let mut values = Vec::with_capacity(((w - 2) * (h - 2)) as usize);
    for y in 1..h - 1 {
        for x in 1..w - 1 {
            let lap = at(x, y - 1)
                + at(x - 1, y)
                + at(x + 1, y)
                + at(x, y + 1)
                - 4.0 * at(x, y);
            values.push(lap);
        }
    }
    if values.is_empty() {
        return 0.0;
    }
    let n = values.len() as f64;
    let mean = values.iter().sum::<f64>() / n;
    values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / n
}

fn rgb_means(rgb: &image::RgbImage) -> (f64, f64, f64) {
    let pixels = rgb.as_raw();
    if pixels.is_empty() {
        return (0.0, 0.0, 0.0);
    }
    let count = (pixels.len() / 3) as f64;
    let mut r = 0.0;
    let mut g = 0.0;
    let mut b = 0.0;
    for chunk in pixels.chunks_exact(3) {
        r += chunk[0] as f64;
        g += chunk[1] as f64;
        b += chunk[2] as f64;
    }
    (r / count / 255.0, g / count / 255.0, b / count / 255.0)
}
