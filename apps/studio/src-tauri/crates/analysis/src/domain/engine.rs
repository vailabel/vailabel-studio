//! The analysis engine — pure computation over dataset metadata and decoded
//! image metrics. Nothing here touches the database, the filesystem, Tauri, or
//! threads, so each function is independently testable.
//!
//! - [`analyze_metadata`] works off the JSON rows (images/annotations/labels).
//! - [`embedding_outliers`] flags images far from the dataset feature centroid.
//! - the report-assembly helpers ([`build_report`], [`collect_findings`],
//!   [`health_summary`], [`classify_image_quality`]) fold the metadata pass and
//!   the (infrastructure-provided) pixel pass into the final [`AnalysisReport`].
//!
//! The slow per-image pixel decode itself is the `ImageDecoder` port, lives in
//! `infrastructure`, and yields the [`PixelMetrics`] / [`PixelOutcome`] consumed
//! here.

use std::collections::HashMap;

use serde_json::Value;
use vailabel_shared::{new_id, now_iso};

use super::*;

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
/// pixel pass) into an [`AnalysisReport`].
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

// ── Pixel metrics (produced by the ImageDecoder port) ───────────────────────

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

// ── Report assembly ─────────────────────────────────────────────────────────

/// Fold one image's [`PixelMetrics`] into the running image-quality report.
pub fn classify_image_quality(
    metric: &PixelMetrics,
    cfg: &AnalysisConfig,
    report: &mut ImageQualityReport,
) {
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

/// Fold the metadata pass + pixel pass into the final persisted report.
pub fn build_report(
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
        id: new_id(),
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

#[allow(clippy::too_many_arguments)]
fn collect_findings(
    quality: &QualityValidation,
    image_quality: &ImageQualityReport,
    outliers: &OutlierReport,
) -> Vec<Finding> {
    let mut findings = Vec::new();
    let mut push = |category: &str, kind: &str, severity: &str, message: String, image_id: Option<String>, annotation_id: Option<String>, metric: Option<f64>| {
        findings.push(Finding {
            id: new_id(),
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
