//! The analysis engine — pure computation over dataset metadata and image
//! pixels. Nothing here touches the database, Tauri, or threads, so each
//! function is independently testable and cheap to reason about.
//!
//! Two passes:
//!   * [`analyze_metadata`] works off the JSON rows already in SQLite (images,
//!     annotations, labels). Fast, no disk I/O.
//!   * [`analyze_pixels`] decodes a single image to derive blur/exposure/
//!     embedding features. Slow; the service runs it on a worker thread and
//!     reports progress.

use std::collections::HashMap;
use std::path::Path;

use image::GenericImageView;
use serde_json::Value;

use super::model::*;

const SUPPORTED_DECODE_EXT: &[&str] = &["jpg", "jpeg", "png", "gif"];
/// Longest edge an image is downscaled to before computing pixel metrics.
const THUMB_EDGE: u32 = 256;

// ── Parsed metadata views ───────────────────────────────────────────────────

struct ImageMeta {
    id: String,
    name: String,
    width: u32,
    height: u32,
}

struct Coord {
    x: f64,
    y: f64,
}

struct AnnMeta {
    id: String,
    image_id: String,
    label_id: Option<String>,
    name: String,
    kind: String,
    coords: Vec<Coord>,
}

/// Everything the metadata pass produces. The service flattens this (plus the
/// pixel pass) into a [`AnalysisReport`].
pub struct MetadataAnalysis {
    pub analytics: DatasetAnalytics,
    pub missing_labels: Vec<ImageRef>,
    pub empty_annotations: Vec<AnnotationRef>,
    pub invalid_polygons: Vec<AnnotationRef>,
    pub rare_classes: Vec<ClassCount>,
    pub suspicious_labels: Vec<AnnotationRef>,
}

// ── JSON helpers ────────────────────────────────────────────────────────────

fn first_str(value: &Value, keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Some(found) = value.get(key).and_then(Value::as_str) {
            if !found.is_empty() {
                return Some(found.to_string());
            }
        }
    }
    None
}

fn first_f64(value: &Value, keys: &[&str]) -> Option<f64> {
    for key in keys {
        if let Some(found) = value.get(key).and_then(Value::as_f64) {
            return Some(found);
        }
    }
    None
}

fn parse_image(value: &Value) -> Option<ImageMeta> {
    Some(ImageMeta {
        id: first_str(value, &["id"])?,
        name: first_str(value, &["name"]).unwrap_or_else(|| "Untitled".into()),
        width: first_f64(value, &["width"]).unwrap_or(0.0).max(0.0) as u32,
        height: first_f64(value, &["height"]).unwrap_or(0.0).max(0.0) as u32,
    })
}

fn parse_annotation(value: &Value) -> Option<AnnMeta> {
    let coords = value
        .get("coordinates")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(|point| {
                    Some(Coord {
                        x: point.get("x").and_then(Value::as_f64)?,
                        y: point.get("y").and_then(Value::as_f64)?,
                    })
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    Some(AnnMeta {
        id: first_str(value, &["id"])?,
        image_id: first_str(value, &["imageId", "image_id"]).unwrap_or_default(),
        label_id: first_str(value, &["labelId", "label_id"]),
        name: first_str(value, &["name"]).unwrap_or_default(),
        kind: first_str(value, &["type", "annotationType", "annotation_type"])
            .unwrap_or_else(|| "box".into()),
        coords,
    })
}

// ── Geometry ────────────────────────────────────────────────────────────────

fn bounding_box(coords: &[Coord]) -> (f64, f64, f64, f64) {
    let mut min_x = f64::MAX;
    let mut min_y = f64::MAX;
    let mut max_x = f64::MIN;
    let mut max_y = f64::MIN;
    for c in coords {
        min_x = min_x.min(c.x);
        min_y = min_y.min(c.y);
        max_x = max_x.max(c.x);
        max_y = max_y.max(c.y);
    }
    (min_x, min_y, max_x, max_y)
}

/// Shoelace area of a closed polygon (absolute value).
fn polygon_area(coords: &[Coord]) -> f64 {
    if coords.len() < 3 {
        return 0.0;
    }
    let mut sum = 0.0;
    for i in 0..coords.len() {
        let a = &coords[i];
        let b = &coords[(i + 1) % coords.len()];
        sum += a.x * b.y - b.x * a.y;
    }
    (sum / 2.0).abs()
}

fn segments_intersect(p1: &Coord, p2: &Coord, p3: &Coord, p4: &Coord) -> bool {
    fn orient(a: &Coord, b: &Coord, c: &Coord) -> f64 {
        (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
    }
    let d1 = orient(p3, p4, p1);
    let d2 = orient(p3, p4, p2);
    let d3 = orient(p1, p2, p3);
    let d4 = orient(p1, p2, p4);
    ((d1 > 0.0 && d2 < 0.0) || (d1 < 0.0 && d2 > 0.0))
        && ((d3 > 0.0 && d4 < 0.0) || (d3 < 0.0 && d4 > 0.0))
}

/// True if any two non-adjacent edges of the polygon cross.
fn is_self_intersecting(coords: &[Coord]) -> bool {
    let n = coords.len();
    if n < 4 {
        return false;
    }
    for i in 0..n {
        let a1 = &coords[i];
        let a2 = &coords[(i + 1) % n];
        for j in (i + 1)..n {
            // skip adjacent / shared-vertex edges
            if j == i || (j + 1) % n == i || (i + 1) % n == j {
                continue;
            }
            let b1 = &coords[j];
            let b2 = &coords[(j + 1) % n];
            if segments_intersect(a1, a2, b1, b2) {
                return true;
            }
        }
    }
    false
}

fn is_multipoint(kind: &str) -> bool {
    matches!(
        kind,
        "polygon" | "linestrip" | "line" | "freeDraw" | "freedraw"
    )
}

fn box_dims(coords: &[Coord]) -> Option<(f64, f64)> {
    if coords.len() < 2 {
        return None;
    }
    let (min_x, min_y, max_x, max_y) = bounding_box(coords);
    Some((max_x - min_x, max_y - min_y))
}

// ── Metadata pass ───────────────────────────────────────────────────────────

pub fn analyze_metadata(
    images: &[Value],
    annotations: &[Value],
    labels: &[Value],
    cfg: &AnalysisConfig,
) -> MetadataAnalysis {
    let images: Vec<ImageMeta> = images.iter().filter_map(parse_image).collect();
    let annotations: Vec<AnnMeta> = annotations.iter().filter_map(parse_annotation).collect();

    // label_id -> (name, color)
    let mut label_lookup: HashMap<String, (String, String)> = HashMap::new();
    for label in labels {
        if let Some(id) = first_str(label, &["id"]) {
            let name = first_str(label, &["name"]).unwrap_or_else(|| "Unnamed".into());
            let color = first_str(label, &["color"]).unwrap_or_else(|| "#94a3b8".into());
            label_lookup.insert(id, (name, color));
        }
    }
    let image_names: HashMap<&str, &str> = images
        .iter()
        .map(|i| (i.id.as_str(), i.name.as_str()))
        .collect();
    let image_dims: HashMap<&str, (u32, u32)> = images
        .iter()
        .map(|i| (i.id.as_str(), (i.width, i.height)))
        .collect();

    let resolve_class = |ann: &AnnMeta| -> (String, Option<String>) {
        if let Some(id) = &ann.label_id {
            if let Some((name, color)) = label_lookup.get(id) {
                return (name.clone(), Some(color.clone()));
            }
        }
        if !ann.name.is_empty() && ann.name != "Annotation" {
            return (ann.name.clone(), None);
        }
        ("unlabeled".into(), None)
    };

    // ── Class distribution ──────────────────────────────────────────────────
    let mut class_counts: HashMap<String, (usize, Option<String>)> = HashMap::new();
    let mut annotations_per_image: HashMap<&str, usize> = HashMap::new();
    let mut type_counts: HashMap<String, usize> = HashMap::new();
    // label_id -> set of distinct images (via count of unique images)
    let mut label_images: HashMap<String, std::collections::HashSet<String>> = HashMap::new();
    let mut label_ann_counts: HashMap<String, usize> = HashMap::new();

    for ann in &annotations {
        let (class_name, class_color) = resolve_class(ann);
        let entry = class_counts.entry(class_name).or_insert((0, None));
        entry.0 += 1;
        if entry.1.is_none() {
            entry.1 = class_color;
        }
        *annotations_per_image.entry(ann.image_id.as_str()).or_insert(0) += 1;
        *type_counts.entry(ann.kind.clone()).or_insert(0) += 1;
        if let Some(id) = &ann.label_id {
            *label_ann_counts.entry(id.clone()).or_insert(0) += 1;
            label_images
                .entry(id.clone())
                .or_default()
                .insert(ann.image_id.clone());
        }
    }

    let total_annotations = annotations.len();
    let mut class_distribution: Vec<ClassCount> = class_counts
        .into_iter()
        .map(|(label, (count, color))| ClassCount {
            label,
            color,
            count,
            percentage: if total_annotations > 0 {
                count as f64 / total_annotations as f64 * 100.0
            } else {
                0.0
            },
        })
        .collect();
    class_distribution.sort_by(|a, b| b.count.cmp(&a.count).then(a.label.cmp(&b.label)));

    // ── Label distribution (defined labels, used or not) ────────────────────
    let mut label_distribution: Vec<LabelUsage> = labels
        .iter()
        .filter_map(|label| {
            let id = first_str(label, &["id"])?;
            let ann_count = label_ann_counts.get(&id).copied().unwrap_or(0);
            let img_count = label_images.get(&id).map(|s| s.len()).unwrap_or(0);
            Some(LabelUsage {
                name: first_str(label, &["name"]).unwrap_or_else(|| "Unnamed".into()),
                color: first_str(label, &["color"]).unwrap_or_else(|| "#94a3b8".into()),
                id,
                annotation_count: ann_count,
                image_count: img_count,
                used: ann_count > 0,
            })
        })
        .collect();
    label_distribution.sort_by(|a, b| b.annotation_count.cmp(&a.annotation_count));

    // ── Resolution statistics ───────────────────────────────────────────────
    let resolution_stats = resolution_stats(&images);

    // ── Dataset statistics ──────────────────────────────────────────────────
    let annotated_images = images
        .iter()
        .filter(|i| annotations_per_image.get(i.id.as_str()).copied().unwrap_or(0) > 0)
        .count();
    let counts_per_image: Vec<usize> = images
        .iter()
        .map(|i| annotations_per_image.get(i.id.as_str()).copied().unwrap_or(0))
        .collect();
    let mut type_count_vec: Vec<TypeCount> = type_counts
        .into_iter()
        .map(|(kind, count)| TypeCount { kind, count })
        .collect();
    type_count_vec.sort_by(|a, b| b.count.cmp(&a.count));

    let dataset_stats = DatasetStats {
        total_images: images.len(),
        annotated_images,
        unannotated_images: images.len().saturating_sub(annotated_images),
        total_annotations,
        mean_annotations_per_image: mean_usize(&counts_per_image),
        median_annotations_per_image: median_usize(&counts_per_image),
        max_annotations_per_image: counts_per_image.iter().copied().max().unwrap_or(0),
        annotated_percentage: if images.is_empty() {
            0.0
        } else {
            annotated_images as f64 / images.len() as f64 * 100.0
        },
        annotation_types: type_count_vec,
    };

    // ── Quality: missing labels (no annotations on the image) ───────────────
    let missing_labels: Vec<ImageRef> = images
        .iter()
        .filter(|i| annotations_per_image.get(i.id.as_str()).copied().unwrap_or(0) == 0)
        .map(|i| ImageRef {
            image_id: i.id.clone(),
            name: i.name.clone(),
            reason: Some("No annotations".into()),
        })
        .collect();

    // ── Quality: empty / invalid / suspicious annotations ───────────────────
    let mut empty_annotations = Vec::new();
    let mut invalid_polygons = Vec::new();
    let mut suspicious_labels = Vec::new();

    for ann in &annotations {
        let (class_name, _) = resolve_class(ann);
        let image_name = image_names
            .get(ann.image_id.as_str())
            .copied()
            .unwrap_or("(unknown image)")
            .to_string();
        let make_ref = |reason: String| AnnotationRef {
            annotation_id: ann.id.clone(),
            image_id: ann.image_id.clone(),
            image_name: image_name.clone(),
            label: class_name.clone(),
            kind: ann.kind.clone(),
            reason,
        };

        // Empty: no points, or a box/circle collapsed to zero area.
        if ann.coords.is_empty() {
            empty_annotations.push(make_ref("No coordinates".into()));
            continue;
        }
        if matches!(ann.kind.as_str(), "box" | "circle") {
            if let Some((w, h)) = box_dims(&ann.coords) {
                if w.abs() < 1.0 || h.abs() < 1.0 {
                    empty_annotations.push(make_ref(format!(
                        "Degenerate {} ({:.0}×{:.0})",
                        ann.kind, w, h
                    )));
                    continue;
                }
            } else {
                empty_annotations.push(make_ref("Too few points".into()));
                continue;
            }
        }

        // Invalid polygons.
        if is_multipoint(&ann.kind) {
            if ann.coords.len() < 3 {
                invalid_polygons.push(make_ref(format!(
                    "Only {} point(s); needs ≥3",
                    ann.coords.len()
                )));
            } else if polygon_area(&ann.coords) < 1.0 {
                invalid_polygons.push(make_ref("Zero-area polygon".into()));
            } else if is_self_intersecting(&ann.coords) {
                invalid_polygons.push(make_ref("Self-intersecting edges".into()));
            }
        }

        // Suspicious labels: tiny or out-of-bounds boxes.
        if let Some((img_w, img_h)) = image_dims.get(ann.image_id.as_str()).copied() {
            if img_w > 0 && img_h > 0 {
                let (min_x, min_y, max_x, max_y) = bounding_box(&ann.coords);
                let img_area = img_w as f64 * img_h as f64;
                let ann_area = (max_x - min_x).abs() * (max_y - min_y).abs();
                if matches!(ann.kind.as_str(), "box")
                    && ann_area > 0.0
                    && ann_area / img_area < cfg.suspicious_area_fraction
                {
                    suspicious_labels.push(make_ref(format!(
                        "Tiny box ({:.3}% of image)",
                        ann_area / img_area * 100.0
                    )));
                } else {
                    let margin = 2.0;
                    let oob = min_x < -margin
                        || min_y < -margin
                        || max_x > img_w as f64 + margin
                        || max_y > img_h as f64 + margin;
                    if oob {
                        suspicious_labels.push(make_ref("Coordinates outside image bounds".into()));
                    }
                }
            }
        }
    }

    // ── Outliers: rare classes ──────────────────────────────────────────────
    let rare_classes: Vec<ClassCount> = class_distribution
        .iter()
        .filter(|c| c.count <= cfg.rare_class_threshold && c.label != "unlabeled")
        .cloned()
        .collect();

    MetadataAnalysis {
        analytics: DatasetAnalytics {
            class_distribution,
            label_distribution,
            resolution_stats,
            dataset_stats,
        },
        missing_labels,
        empty_annotations,
        invalid_polygons,
        rare_classes,
        suspicious_labels,
    }
}

fn resolution_stats(images: &[ImageMeta]) -> ResolutionStats {
    let valid: Vec<&ImageMeta> = images.iter().filter(|i| i.width > 0 && i.height > 0).collect();
    if valid.is_empty() {
        return ResolutionStats::default();
    }
    let widths: Vec<u32> = valid.iter().map(|i| i.width).collect();
    let heights: Vec<u32> = valid.iter().map(|i| i.height).collect();

    let mut res_counts: HashMap<(u32, u32), usize> = HashMap::new();
    let mut aspect_counts: HashMap<&'static str, usize> = HashMap::new();
    let mut megapixels = 0.0;
    for i in &valid {
        *res_counts.entry((i.width, i.height)).or_insert(0) += 1;
        *aspect_counts.entry(aspect_bucket(i.width, i.height)).or_insert(0) += 1;
        megapixels += (i.width as f64 * i.height as f64) / 1_000_000.0;
    }

    let mut common_resolutions: Vec<ResolutionCount> = res_counts
        .into_iter()
        .map(|((width, height), count)| ResolutionCount { width, height, count })
        .collect();
    common_resolutions.sort_by(|a, b| b.count.cmp(&a.count));
    common_resolutions.truncate(8);

    let mut aspect_buckets: Vec<AspectBucket> = aspect_counts
        .into_iter()
        .map(|(ratio, count)| AspectBucket {
            ratio: ratio.to_string(),
            count,
        })
        .collect();
    aspect_buckets.sort_by(|a, b| b.count.cmp(&a.count));

    ResolutionStats {
        min_width: *widths.iter().min().unwrap(),
        max_width: *widths.iter().max().unwrap(),
        min_height: *heights.iter().min().unwrap(),
        max_height: *heights.iter().max().unwrap(),
        mean_width: mean_u32(&widths),
        mean_height: mean_u32(&heights),
        median_width: median_u32(&widths),
        median_height: median_u32(&heights),
        megapixels_mean: megapixels / valid.len() as f64,
        common_resolutions,
        aspect_buckets,
    }
}

fn aspect_bucket(width: u32, height: u32) -> &'static str {
    if height == 0 {
        return "other";
    }
    let ratio = width as f64 / height as f64;
    let near = |target: f64| (ratio - target).abs() / target < 0.04;
    if near(1.0) {
        "1:1"
    } else if near(4.0 / 3.0) {
        "4:3"
    } else if near(3.0 / 4.0) {
        "3:4"
    } else if near(16.0 / 9.0) {
        "16:9"
    } else if near(9.0 / 16.0) {
        "9:16"
    } else if near(3.0 / 2.0) {
        "3:2"
    } else {
        "other"
    }
}

// ── Pixel pass ──────────────────────────────────────────────────────────────

pub struct PixelMetrics {
    pub image_id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub blur_score: f64,
    pub brightness: f64,
    pub clip_high: f64,
    pub clip_low: f64,
    /// Standardizable feature vector for embedding-outlier detection.
    pub features: Vec<f64>,
}

pub enum PixelOutcome {
    Metrics(Box<PixelMetrics>),
    Corrupted(String),
    Unsupported,
}

pub fn analyze_pixels(image_id: &str, name: &str, path: &str, _cfg: &AnalysisConfig) -> PixelOutcome {
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

/// Standardize each feature dimension (z-score) and flag images whose distance
/// from the dataset centroid (RMS of z-scores) exceeds `z_threshold`.
pub fn embedding_outliers(metrics: &[PixelMetrics], z_threshold: f64) -> Vec<OutlierRef> {
    if metrics.len() < 8 {
        return Vec::new();
    }
    let dims = metrics[0].features.len();
    let n = metrics.len() as f64;

    let mut means = vec![0.0; dims];
    for m in metrics {
        for (i, &f) in m.features.iter().enumerate() {
            means[i] += f;
        }
    }
    for mean in means.iter_mut() {
        *mean /= n;
    }
    let mut stds = vec![0.0; dims];
    for m in metrics {
        for (i, &f) in m.features.iter().enumerate() {
            stds[i] += (f - means[i]).powi(2);
        }
    }
    for std in stds.iter_mut() {
        *std = (*std / n).sqrt();
        if *std < 1e-9 {
            *std = 1.0; // constant dimension contributes nothing
        }
    }

    let mut outliers: Vec<OutlierRef> = metrics
        .iter()
        .filter_map(|m| {
            let mut sum_sq = 0.0;
            for (i, &f) in m.features.iter().enumerate() {
                let z = (f - means[i]) / stds[i];
                sum_sq += z * z;
            }
            let score = (sum_sq / dims as f64).sqrt();
            if score >= z_threshold {
                Some(OutlierRef {
                    image_id: m.image_id.clone(),
                    name: m.name.clone(),
                    score,
                    reason: format!("{score:.2}σ from dataset centroid"),
                })
            } else {
                None
            }
        })
        .collect();
    outliers.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    outliers.truncate(50);
    outliers
}

// ── Small numeric helpers ───────────────────────────────────────────────────

fn mean_usize(values: &[usize]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    values.iter().sum::<usize>() as f64 / values.len() as f64
}

fn median_usize(values: &[usize]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let mut sorted = values.to_vec();
    sorted.sort_unstable();
    let mid = sorted.len() / 2;
    if sorted.len() % 2 == 0 {
        (sorted[mid - 1] + sorted[mid]) as f64 / 2.0
    } else {
        sorted[mid] as f64
    }
}

fn mean_u32(values: &[u32]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    values.iter().map(|&v| v as f64).sum::<f64>() / values.len() as f64
}

fn median_u32(values: &[u32]) -> u32 {
    if values.is_empty() {
        return 0;
    }
    let mut sorted = values.to_vec();
    sorted.sort_unstable();
    sorted[sorted.len() / 2]
}
