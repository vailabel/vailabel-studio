//! MobileSAM / SAM 2 interactive segmentation as a [`ModelPlugin`].
//!
//! Two ONNX graphs run in sequence:
//!   1. **image encoder** (`image_encoder.onnx`): the image → a `[1,256,64,64]`
//!      embedding. Expensive; cached per image so repeated clicks are cheap.
//!   2. **mask decoder** (`mask_decoder.onnx`): the embedding + point/box prompts
//!      → low-res mask logits, upsampled to the original image size.
//!
//! The decoder mask is thresholded and traced into a polygon (`imageproc`
//! Suzuki contours + Ramer–Douglas–Peucker simplification) so the result lands
//! in the predictions review loop exactly like a detector box.
//!
//! I/O contract targeted: the common community export (samexporter / AnyLabeling),
//! decoder inputs `image_embeddings`, `point_coords`, `point_labels`,
//! `mask_input`, `has_mask_input`, `orig_im_size`. A box prompt is encoded as two
//! points (top-left label 2, bottom-right label 3); point-only prompts append a
//! `(0,0)` label `-1` padding point. Exports that rename these inputs will need
//! the names adjusted here — all the I/O is isolated in this module.

use std::path::{Path, PathBuf};

use image::{GrayImage, Luma, RgbImage};
use imageproc::contours::{find_contours, BorderType};
use ndarray::{Array1, Array2, Array3, Array4, ArrayD, IxDyn};
use ort::session::builder::GraphOptimizationLevel;
use ort::session::Session;
use ort::value::TensorRef;
use serde_json::Value;

use crate::ai::model::{InferenceAnnotationDraft, InferencePoint};
use crate::ai::plugin::{BoxPrompt, ModelPlugin, PipelineRequest, PointPrompt};
use crate::{value_string, AppError};

/// SAM ViT encoder input side length.
const ENCODER_SIZE: u32 = 1024;
/// ImageNet-style normalization SAM was trained with (0–255 scale).
const PIXEL_MEAN: [f32; 3] = [123.675, 116.28, 103.53];
const PIXEL_STD: [f32; 3] = [58.395, 57.12, 57.375];
/// Cap on polygon vertices so the canvas/store stay responsive.
const MAX_POLYGON_VERTICES: usize = 150;

/// One object's worth of prompts → one decoder run → one mask.
struct PromptGroup {
    bbox: Option<BoxPrompt>,
    points: Vec<PointPrompt>,
}

struct SamSessions {
    encoder: Session,
    decoder: Session,
    /// Absolute encoder path; lets us detect a model swap and rebuild.
    encoder_path: PathBuf,
}

/// The image embedding for one image, cached so multiple clicks/boxes on the same
/// image only pay the encoder once.
struct CachedEmbedding {
    key: String,
    embedding: ArrayD<f32>,
    orig_w: u32,
    orig_h: u32,
    /// `ENCODER_SIZE / long_side`: image-space → encoder-space coordinate scale.
    scale: f32,
}

/// Interactive segmenter. Sessions and the per-image embedding are built lazily on
/// the first `run` and reused while the plugin instance is cached (see the engine
/// cache in `AiService`).
pub struct SamSegmenter {
    sessions: Option<SamSessions>,
    cache: Option<CachedEmbedding>,
}

impl Default for SamSegmenter {
    fn default() -> Self {
        Self::new()
    }
}

impl SamSegmenter {
    pub fn new() -> Self {
        Self {
            sessions: None,
            cache: None,
        }
    }

    /// Build (or rebuild on model swap) the encoder + decoder sessions from the
    /// model entity's file paths.
    fn ensure_sessions(&mut self, model: &Value) -> Result<(), AppError> {
        let (encoder_path, decoder_path) = resolve_sam_paths(model)?;
        let needs_build = match &self.sessions {
            Some(sessions) => sessions.encoder_path != encoder_path,
            None => true,
        };
        if needs_build {
            let encoder = build_session(&encoder_path)?;
            let decoder = build_session(&decoder_path)?;
            self.sessions = Some(SamSessions {
                encoder,
                decoder,
                encoder_path,
            });
            // A new model invalidates any cached embedding.
            self.cache = None;
        }
        Ok(())
    }

    /// Encode the image (or return the cached embedding for it).
    fn embedding_for(&mut self, image_path: &str) -> Result<&CachedEmbedding, AppError> {
        let key = embedding_key(image_path);
        let is_hit = self
            .cache
            .as_ref()
            .map(|cached| cached.key == key)
            .unwrap_or(false);

        if !is_hit {
            let decoded = image::open(image_path).map_err(|error| {
                AppError::Message(format!("Failed to load image for segmentation: {error}"))
            })?;
            let rgb = decoded.to_rgb8();
            let orig_w = rgb.width().max(1);
            let orig_h = rgb.height().max(1);
            let (input, scale) = preprocess_for_encoder(&rgb);

            let sessions = self
                .sessions
                .as_mut()
                .ok_or_else(|| AppError::Message("SAM sessions are not initialized".into()))?;
            let outputs = sessions
                .encoder
                .run(ort::inputs![TensorRef::from_array_view(input.view())?])
                .map_err(|error| {
                    AppError::Message(format!("SAM image encoder run failed: {error}"))
                })?;
            let (_, embedding_value) = outputs.into_iter().next().ok_or_else(|| {
                AppError::Message("SAM image encoder returned no output".into())
            })?;
            let (shape, data) = embedding_value
                .try_extract_tensor::<f32>()
                .map_err(|error| {
                    AppError::Message(format!("Failed to read SAM embedding tensor: {error}"))
                })?;
            let dims: Vec<usize> = shape.iter().map(|value| (*value).max(0) as usize).collect();
            let embedding = ArrayD::from_shape_vec(IxDyn(&dims), data.to_vec())
                .map_err(|error| AppError::Message(format!("Bad SAM embedding shape: {error}")))?;

            self.cache = Some(CachedEmbedding {
                key,
                embedding,
                orig_w,
                orig_h,
                scale,
            });
        }

        Ok(self.cache.as_ref().expect("embedding cached above"))
    }
}

impl ModelPlugin for SamSegmenter {
    fn task(&self) -> &'static str {
        "segmentation"
    }

    fn run(
        &mut self,
        request: &PipelineRequest,
    ) -> Result<Vec<InferenceAnnotationDraft>, AppError> {
        let groups = build_prompt_groups(&request.prompt.points, &request.prompt.boxes)?;

        self.ensure_sessions(request.model)?;
        // Snapshot the embedding fields we need so we can borrow the decoder
        // mutably afterwards without aliasing `self.cache`.
        let (embedding, orig_w, orig_h, scale) = {
            let cached = self.embedding_for(request.image_path)?;
            (
                cached.embedding.clone(),
                cached.orig_w,
                cached.orig_h,
                cached.scale,
            )
        };

        let sessions = self
            .sessions
            .as_mut()
            .ok_or_else(|| AppError::Message("SAM sessions are not initialized".into()))?;

        // A target label from a text prompt (e.g. chained from "find all cars")
        // names the polygons; otherwise they're generic "object" predictions.
        let label = request
            .prompt
            .text
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("object")
            .to_string();

        let mut drafts = Vec::new();
        for group in groups {
            let (coords, labels) = build_prompt_tensors(&group, scale);
            let point_count = labels.len_of(ndarray::Axis(1));
            if point_count == 0 {
                continue;
            }

            let mask_input = Array4::<f32>::zeros((1, 1, 256, 256));
            let has_mask_input = Array1::<f32>::zeros(1);
            let orig_im_size = Array1::from_vec(vec![orig_h as f32, orig_w as f32]);

            let outputs = sessions
                .decoder
                .run(ort::inputs! {
                    "image_embeddings" => TensorRef::from_array_view(embedding.view())?,
                    "point_coords" => TensorRef::from_array_view(coords.view())?,
                    "point_labels" => TensorRef::from_array_view(labels.view())?,
                    "mask_input" => TensorRef::from_array_view(mask_input.view())?,
                    "has_mask_input" => TensorRef::from_array_view(has_mask_input.view())?,
                    "orig_im_size" => TensorRef::from_array_view(orig_im_size.view())?,
                })
                .map_err(|error| {
                    AppError::Message(format!("SAM mask decoder run failed: {error}"))
                })?;

            // Collect the IoU scores and the highest-resolution mask tensor from
            // the (export-specific) named outputs.
            let mut iou: Vec<f32> = Vec::new();
            let mut mask_tensor: Option<(Vec<usize>, Vec<f32>)> = None;
            for (name, value) in outputs {
                let Ok((shape, data)) = value.try_extract_tensor::<f32>() else {
                    continue;
                };
                let dims: Vec<usize> =
                    shape.iter().map(|value| (*value).max(0) as usize).collect();
                if name.to_lowercase().contains("iou") {
                    iou = data.to_vec();
                } else if dims.len() == 4 {
                    let area = dims[2] * dims[3];
                    let keep = mask_tensor
                        .as_ref()
                        .map(|(existing, _)| area > existing[2] * existing[3])
                        .unwrap_or(true);
                    if keep {
                        mask_tensor = Some((dims, data.to_vec()));
                    }
                }
            }

            let decoded = mask_tensor
                .and_then(|(dims, data)| select_best_mask(&dims, &data, &iou, orig_w, orig_h));
            if let Some((mask, confidence)) = decoded {
                if let Some(coordinates) = mask_to_polygon(&mask) {
                    drafts.push(InferenceAnnotationDraft {
                        name: label.clone(),
                        annotation_type: "polygon".into(),
                        coordinates,
                        confidence,
                        label_id: None,
                        label_name: Some(label.clone()),
                        label_color: None,
                        is_ai_generated: true,
                    });
                }
            }
        }

        Ok(drafts)
    }
}

/// Build the ORT session for one ONNX file, mirroring the detector's settings
/// (graph opt level 3, 4 intra-threads, CUDA EP with CPU fallback).
fn build_session(model_path: &Path) -> Result<Session, AppError> {
    if !model_path.exists() {
        return Err(AppError::Message(format!(
            "SAM ONNX component not found: {}",
            model_path.display()
        )));
    }
    let mut builder = Session::builder()
        .map_err(|e| AppError::Message(format!("Failed to create ONNX session builder: {e}")))?
        // `All` (ORT_ENABLE_ALL = 99), not `Level3`: in ort 2.0-rc.12 `Level3`
        // maps to ORT_ENABLE_LAYOUT (3), which only exists in ONNX Runtime 1.23+;
        // our bundled 1.22 runtime rejects it. See inference.rs for the full note.
        .with_optimization_level(GraphOptimizationLevel::All)
        .map_err(|e| AppError::Message(format!("Failed to set optimization level: {e}")))?
        .with_intra_threads(4)
        .map_err(|e| AppError::Message(format!("Failed to set intra threads: {e}")))?
        .with_execution_providers([
            ort::execution_providers::CUDAExecutionProvider::default().build()
        ])
        .map_err(|e| AppError::Message(format!("Failed to set execution providers: {e}")))?;
    builder
        .commit_from_file(model_path)
        .map_err(|error| AppError::Message(format!("Failed to load SAM ONNX model: {error}")))
}

/// Resolve `(encoder, decoder)` ONNX paths from the model entity. The installer
/// puts both files in one directory; we match them by name so it doesn't matter
/// which one `modelPath` points at.
fn resolve_sam_paths(model: &Value) -> Result<(PathBuf, PathBuf), AppError> {
    let model_path = value_string(model, "modelPath", "model_path").ok_or_else(|| {
        AppError::Message("SAM model has no local file path".into())
    })?;
    let model_path = PathBuf::from(model_path);
    let dir = model_path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."));

    let mut encoder = None;
    let mut decoder = None;
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let lower = path
                .file_name()
                .and_then(|name| name.to_str())
                .map(str::to_lowercase)
                .unwrap_or_default();
            if !lower.ends_with(".onnx") {
                continue;
            }
            if lower.contains("encoder") {
                encoder = Some(path);
            } else if lower.contains("decoder") {
                decoder = Some(path);
            }
        }
    }

    // Fall back to the declared modelPath for the encoder if name-matching failed.
    let encoder = encoder.unwrap_or(model_path);
    let decoder = decoder.ok_or_else(|| {
        AppError::Message(
            "SAM mask decoder (mask_decoder.onnx) was not found next to the encoder. Reinstall \
             the model so both ONNX components are downloaded."
                .into(),
        )
    })?;
    Ok((encoder, decoder))
}

/// Group raw prompts into per-object sets. Each box is its own object; bare points
/// form a single object. When boxes and points are both present, the points refine
/// each box.
fn build_prompt_groups(
    points: &[PointPrompt],
    boxes: &[BoxPrompt],
) -> Result<Vec<PromptGroup>, AppError> {
    if boxes.is_empty() && points.is_empty() {
        return Err(AppError::Message(
            "Segmentation needs at least one point or box prompt. Click an object or draw a box, \
             then ask me to segment it."
                .into(),
        ));
    }

    let groups = if !boxes.is_empty() {
        boxes
            .iter()
            .map(|bbox| PromptGroup {
                bbox: Some(bbox.clone()),
                points: points.to_vec(),
            })
            .collect()
    } else {
        vec![PromptGroup {
            bbox: None,
            points: points.to_vec(),
        }]
    };
    Ok(groups)
}

/// Build the SAM decoder's `point_coords` `[1,N,2]` and `point_labels` `[1,N]`
/// tensors for one prompt group, in encoder-space coordinates.
///
/// Box → two points (top-left label `2`, bottom-right label `3`); positive point
/// label `1`, negative `0`; a point-only prompt gets a trailing `(0,0)` label `-1`
/// padding point (required by the standard decoder when no box is present).
fn build_prompt_tensors(group: &PromptGroup, scale: f32) -> (Array3<f32>, Array2<f32>) {
    let mut coords: Vec<[f32; 2]> = Vec::new();
    let mut labels: Vec<f32> = Vec::new();

    if let Some(bbox) = &group.bbox {
        let (x1, y1, x2, y2) = (
            bbox.x1.min(bbox.x2),
            bbox.y1.min(bbox.y2),
            bbox.x1.max(bbox.x2),
            bbox.y1.max(bbox.y2),
        );
        coords.push([x1 * scale, y1 * scale]);
        labels.push(2.0);
        coords.push([x2 * scale, y2 * scale]);
        labels.push(3.0);
    }

    for point in &group.points {
        coords.push([point.x * scale, point.y * scale]);
        labels.push(if point.positive { 1.0 } else { 0.0 });
    }

    if group.bbox.is_none() {
        coords.push([0.0, 0.0]);
        labels.push(-1.0);
    }

    let n = coords.len();
    let coords_arr = Array3::from_shape_fn((1, n, 2), |(_, i, j)| coords[i][j]);
    let labels_arr = Array2::from_shape_fn((1, n), |(_, i)| labels[i]);
    (coords_arr, labels_arr)
}

/// Preprocess an image for the SAM encoder: long-side-1024 resize (aspect kept),
/// top-left pad to 1024×1024, SAM normalization, NCHW. Returns the input tensor and
/// the image→encoder coordinate `scale`.
fn preprocess_for_encoder(image: &RgbImage) -> (Array4<f32>, f32) {
    let orig_w = image.width().max(1);
    let orig_h = image.height().max(1);
    let long_side = orig_w.max(orig_h) as f32;
    let scale = ENCODER_SIZE as f32 / long_side;
    let new_w = ((orig_w as f32 * scale).round() as u32)
        .max(1)
        .min(ENCODER_SIZE);
    let new_h = ((orig_h as f32 * scale).round() as u32)
        .max(1)
        .min(ENCODER_SIZE);
    let resized = image::imageops::resize(image, new_w, new_h, image::imageops::FilterType::Triangle);

    let mut input = Array4::<f32>::zeros((1, 3, ENCODER_SIZE as usize, ENCODER_SIZE as usize));
    for (x, y, pixel) in resized.enumerate_pixels() {
        let (x, y) = (x as usize, y as usize);
        for c in 0..3 {
            input[[0, c, y, x]] = (pixel[c] as f32 - PIXEL_MEAN[c]) / PIXEL_STD[c];
        }
    }
    (input, scale)
}

/// Pick the highest-IoU mask plane from a decoder mask tensor (`[1,num,H,W]`,
/// flattened) and binarize it to a full-resolution `GrayImage` (255 = foreground).
/// Returns `(mask, confidence)`.
fn select_best_mask(
    dims: &[usize],
    data: &[f32],
    iou: &[f32],
    orig_w: u32,
    orig_h: u32,
) -> Option<(GrayImage, f32)> {
    if dims.len() != 4 {
        return None;
    }
    let (num, mask_h, mask_w) = (dims[1].max(1), dims[2], dims[3]);
    if mask_h == 0 || mask_w == 0 {
        return None;
    }

    let best_idx = iou
        .iter()
        .enumerate()
        .max_by(|a, b| a.1.total_cmp(b.1))
        .map(|(index, _)| index)
        .filter(|index| *index < num)
        .unwrap_or(0);
    let confidence = iou.get(best_idx).copied().unwrap_or(1.0);

    let plane = best_idx * mask_h * mask_w;
    let mut binary = GrayImage::new(mask_w as u32, mask_h as u32);
    for y in 0..mask_h {
        for x in 0..mask_w {
            let logit = data.get(plane + y * mask_w + x).copied().unwrap_or(0.0);
            binary.put_pixel(x as u32, y as u32, Luma([if logit > 0.0 { 255 } else { 0 }]));
        }
    }

    // The standard export already upsamples to orig size via `orig_im_size`; if a
    // given export returned a low-res mask, resize it to image space here.
    let mask = if mask_w as u32 != orig_w || mask_h as u32 != orig_h {
        image::imageops::resize(
            &binary,
            orig_w,
            orig_h,
            image::imageops::FilterType::Nearest,
        )
    } else {
        binary
    };

    Some((mask, confidence))
}

/// Trace the largest foreground region of a binary mask into a simplified polygon
/// in image-space coordinates. Returns `None` if no usable contour is found.
fn mask_to_polygon(mask: &GrayImage) -> Option<Vec<InferencePoint>> {
    let contours = find_contours::<u32>(mask);
    let best = contours
        .iter()
        .filter(|contour| matches!(contour.border_type, BorderType::Outer))
        .map(|contour| {
            let points: Vec<(f32, f32)> = contour
                .points
                .iter()
                .map(|point| (point.x as f32, point.y as f32))
                .collect();
            (polygon_area(&points), points)
        })
        .max_by(|a, b| a.0.total_cmp(&b.0))?;

    let points = best.1;
    if points.len() < 3 {
        return None;
    }

    let diagonal = ((mask.width() as f32).powi(2) + (mask.height() as f32).powi(2)).sqrt();
    let epsilon = (diagonal * 0.005).max(1.0);
    let mut simplified = rdp_simplify(&points, epsilon);
    if simplified.len() < 3 {
        simplified = points;
    }
    if simplified.len() > MAX_POLYGON_VERTICES {
        let stride = simplified.len().div_ceil(MAX_POLYGON_VERTICES);
        simplified = simplified
            .into_iter()
            .step_by(stride.max(1))
            .collect::<Vec<_>>();
    }
    if simplified.len() < 3 {
        return None;
    }

    Some(
        simplified
            .into_iter()
            .map(|(x, y)| InferencePoint { x, y })
            .collect(),
    )
}

/// Shoelace area of a closed polygon.
fn polygon_area(points: &[(f32, f32)]) -> f32 {
    if points.len() < 3 {
        return 0.0;
    }
    let mut area = 0.0;
    for i in 0..points.len() {
        let (x0, y0) = points[i];
        let (x1, y1) = points[(i + 1) % points.len()];
        area += x0 * y1 - x1 * y0;
    }
    (area / 2.0).abs()
}

/// Ramer–Douglas–Peucker polyline simplification.
fn rdp_simplify(points: &[(f32, f32)], epsilon: f32) -> Vec<(f32, f32)> {
    if points.len() < 3 {
        return points.to_vec();
    }
    let mut keep = vec![false; points.len()];
    keep[0] = true;
    keep[points.len() - 1] = true;
    rdp_recurse(points, 0, points.len() - 1, epsilon, &mut keep);
    points
        .iter()
        .zip(keep)
        .filter_map(|(point, keep)| if keep { Some(*point) } else { None })
        .collect()
}

fn rdp_recurse(points: &[(f32, f32)], first: usize, last: usize, epsilon: f32, keep: &mut [bool]) {
    if last <= first + 1 {
        return;
    }
    let (mut max_dist, mut index) = (0.0f32, first);
    for i in (first + 1)..last {
        let dist = perpendicular_distance(points[i], points[first], points[last]);
        if dist > max_dist {
            max_dist = dist;
            index = i;
        }
    }
    if max_dist > epsilon {
        keep[index] = true;
        rdp_recurse(points, first, index, epsilon, keep);
        rdp_recurse(points, index, last, epsilon, keep);
    }
}

fn perpendicular_distance(point: (f32, f32), line_a: (f32, f32), line_b: (f32, f32)) -> f32 {
    let (px, py) = point;
    let (ax, ay) = line_a;
    let (bx, by) = line_b;
    let dx = bx - ax;
    let dy = by - ay;
    let denom = (dx * dx + dy * dy).sqrt();
    if denom <= f32::EPSILON {
        return ((px - ax).powi(2) + (py - ay).powi(2)).sqrt();
    }
    ((dx * (ay - py) - dy * (ax - px)).abs()) / denom
}

/// Cache key for an image's embedding: path + size + mtime, so an edited file
/// re-encodes while repeated clicks on the same file reuse the embedding.
fn embedding_key(image_path: &str) -> String {
    let meta = std::fs::metadata(image_path).ok();
    let len = meta.as_ref().map(|m| m.len()).unwrap_or(0);
    let mtime = meta
        .and_then(|m| m.modified().ok())
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("{image_path}:{len}:{mtime}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn box_prompt_becomes_two_corner_points() {
        let group = PromptGroup {
            bbox: Some(BoxPrompt {
                x1: 100.0,
                y1: 50.0,
                x2: 200.0,
                y2: 150.0,
            }),
            points: Vec::new(),
        };
        let (coords, labels) = build_prompt_tensors(&group, 0.5);
        // Two corner points, no padding point (a box is present).
        assert_eq!(labels.shape(), &[1, 2]);
        assert_eq!(labels[[0, 0]], 2.0);
        assert_eq!(labels[[0, 1]], 3.0);
        // Coordinates scaled into encoder space.
        assert_eq!(coords[[0, 0, 0]], 50.0);
        assert_eq!(coords[[0, 0, 1]], 25.0);
        assert_eq!(coords[[0, 1, 0]], 100.0);
        assert_eq!(coords[[0, 1, 1]], 75.0);
    }

    #[test]
    fn point_prompt_appends_padding_point() {
        let group = PromptGroup {
            bbox: None,
            points: vec![PointPrompt {
                x: 10.0,
                y: 20.0,
                positive: true,
            }],
        };
        let (coords, labels) = build_prompt_tensors(&group, 1.0);
        // The click plus the (0,0)/-1 padding point the decoder requires.
        assert_eq!(labels.shape(), &[1, 2]);
        assert_eq!(labels[[0, 0]], 1.0);
        assert_eq!(labels[[0, 1]], -1.0);
        assert_eq!(coords[[0, 1, 0]], 0.0);
        assert_eq!(coords[[0, 1, 1]], 0.0);
    }

    #[test]
    fn negative_point_gets_zero_label() {
        let group = PromptGroup {
            bbox: None,
            points: vec![PointPrompt {
                x: 5.0,
                y: 5.0,
                positive: false,
            }],
        };
        let (_coords, labels) = build_prompt_tensors(&group, 1.0);
        assert_eq!(labels[[0, 0]], 0.0);
    }

    #[test]
    fn build_prompt_groups_one_group_per_box() {
        let boxes = vec![
            BoxPrompt { x1: 0.0, y1: 0.0, x2: 1.0, y2: 1.0 },
            BoxPrompt { x1: 2.0, y1: 2.0, x2: 3.0, y2: 3.0 },
        ];
        let groups = build_prompt_groups(&[], &boxes).expect("groups");
        assert_eq!(groups.len(), 2);
        assert!(groups.iter().all(|group| group.bbox.is_some()));
    }

    #[test]
    fn build_prompt_groups_requires_a_prompt() {
        assert!(build_prompt_groups(&[], &[]).is_err());
    }

    #[test]
    fn traces_a_square_mask_into_a_polygon() {
        // A 40×40 white square inside a 100×100 black mask.
        let mut mask = GrayImage::new(100, 100);
        for y in 30..70 {
            for x in 30..70 {
                mask.put_pixel(x, y, Luma([255]));
            }
        }
        let polygon = mask_to_polygon(&mask).expect("polygon");
        // A simplified square is a handful of vertices, all inside the image.
        assert!(polygon.len() >= 3 && polygon.len() <= 12, "got {}", polygon.len());
        assert!(polygon
            .iter()
            .all(|point| point.x >= 0.0 && point.x <= 100.0 && point.y >= 0.0 && point.y <= 100.0));
    }

    #[test]
    fn empty_mask_has_no_polygon() {
        let mask = GrayImage::new(50, 50);
        assert!(mask_to_polygon(&mask).is_none());
    }
}
