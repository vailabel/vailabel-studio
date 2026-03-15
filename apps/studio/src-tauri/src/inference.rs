use serde::Serialize;

use crate::{AppError, InferenceAnnotationDraft, InferencePoint};

#[cfg(feature = "yolo-inference")]
use {
    image::{imageops::FilterType, ImageBuffer, Rgb, RgbImage},
    ndarray::Array4,
    ort::{
        session::Session,
        value::{TensorRef, ValueType},
    },
    serde_json::Value,
    std::{path::Path, time::Instant},
};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InferenceMetrics {
    pub backend: String,
    pub init_ms: u128,
    pub infer_ms: u128,
}

pub trait InferenceEngine: Send + Sync {
    fn predict(
        &mut self,
        image: &serde_json::Value,
        model: &serde_json::Value,
        labels: &[serde_json::Value],
        threshold: f32,
    ) -> Result<(Vec<InferenceAnnotationDraft>, InferenceMetrics), AppError>;
}

#[cfg(feature = "yolo-inference")]
#[derive(Clone, Copy, Debug)]
enum InputLayout {
    Nchw,
    Nhwc,
}

#[cfg(feature = "yolo-inference")]
#[derive(Clone, Copy, Debug)]
struct LetterboxTransform {
    scale: f32,
    pad_x: f32,
    pad_y: f32,
    original_width: f32,
    original_height: f32,
}

#[cfg(feature = "yolo-inference")]
#[derive(Clone, Copy, Debug)]
struct DetectionCandidate {
    class_index: usize,
    confidence: f32,
    bbox: [f32; 4],
}

#[cfg(feature = "yolo-inference")]
pub struct YoloEngine {
    backend: String,
    session: Session,
    input_width: usize,
    input_height: usize,
    input_layout: InputLayout,
    class_names: Vec<String>,
    init_ms: u128,
}

#[cfg(feature = "yolo-inference")]
impl YoloEngine {
    pub fn new(model_path: &str, class_names: Vec<String>) -> Result<Self, AppError> {
        if !Path::new(model_path).exists() {
            return Err(AppError::Message("ONNX model file not found".into()));
        }

        let started_at = Instant::now();
        let session = Session::builder()?.commit_from_file(model_path)?;
        let input = session.inputs().first().ok_or_else(|| {
            AppError::Message("The ONNX model does not expose an input tensor".into())
        })?;
        let (input_width, input_height, input_layout) = infer_input_layout(input.dtype())?;

        Ok(Self {
            backend: "ort".into(),
            session,
            input_width,
            input_height,
            input_layout,
            class_names,
            init_ms: started_at.elapsed().as_millis(),
        })
    }
}

#[cfg(feature = "yolo-inference")]
impl InferenceEngine for YoloEngine {
    fn predict(
        &mut self,
        image: &serde_json::Value,
        _model: &serde_json::Value,
        _labels: &[serde_json::Value],
        threshold: f32,
    ) -> Result<(Vec<InferenceAnnotationDraft>, InferenceMetrics), AppError> {
        let image_data = image.get("data").and_then(Value::as_str).ok_or_else(|| {
            AppError::Message("Image data is unavailable for AI annotation".into())
        })?;
        let image_bytes = crate::decode_file_bytes(image_data)?;
        let decoded = image::load_from_memory(&image_bytes).map_err(|error| {
            AppError::Message(format!("Failed to load image for inference: {error}"))
        })?;
        let rgb = decoded.to_rgb8();
        let (prepared, transform) =
            letterbox_image(&rgb, self.input_width as u32, self.input_height as u32);
        let input_tensor = build_input_tensor(&prepared, self.input_layout)?;

        let started_at = Instant::now();
        let outputs = self.session.run(ort::inputs![TensorRef::from_array_view(
            input_tensor.view()
        )?])?;
        let infer_ms = started_at.elapsed().as_millis();
        let (shape, data) = outputs[0].try_extract_tensor::<f32>()?;

        let detections = decode_candidates(
            &shape.iter().copied().collect::<Vec<_>>(),
            data,
            threshold,
            &self.class_names,
            transform,
        )?;
        let drafts = detections
            .into_iter()
            .map(|candidate| {
                let label_name = self
                    .class_names
                    .get(candidate.class_index)
                    .cloned()
                    .unwrap_or_else(|| format!("Class {}", candidate.class_index));

                InferenceAnnotationDraft {
                    name: label_name.clone(),
                    annotation_type: "box".into(),
                    coordinates: vec![
                        InferencePoint {
                            x: candidate.bbox[0],
                            y: candidate.bbox[1],
                        },
                        InferencePoint {
                            x: candidate.bbox[2],
                            y: candidate.bbox[3],
                        },
                    ],
                    confidence: candidate.confidence,
                    label_id: None,
                    label_name: Some(label_name),
                    label_color: None,
                    is_ai_generated: true,
                }
            })
            .collect();

        let metrics = InferenceMetrics {
            backend: self.backend.clone(),
            init_ms: self.init_ms,
            infer_ms,
        };
        Ok((drafts, metrics))
    }
}

#[cfg(feature = "yolo-inference")]
fn infer_input_layout(dtype: &ValueType) -> Result<(usize, usize, InputLayout), AppError> {
    let shape = dtype
        .tensor_shape()
        .ok_or_else(|| AppError::Message("The ONNX model input must be a tensor".into()))?;
    let dims = shape.iter().copied().collect::<Vec<_>>();

    if dims.len() != 4 {
        return Err(AppError::Message(format!(
            "Unsupported ONNX input rank for YOLO detection: {:?}",
            dims
        )));
    }

    let default_size = 640usize;
    let width_from = |value: i64| {
        if value > 0 {
            value as usize
        } else {
            default_size
        }
    };

    if dims[1] == 3 || dims[3] != 3 {
        return Ok((width_from(dims[3]), width_from(dims[2]), InputLayout::Nchw));
    }

    Ok((width_from(dims[2]), width_from(dims[1]), InputLayout::Nhwc))
}

#[cfg(feature = "yolo-inference")]
fn letterbox_image(
    image: &RgbImage,
    target_width: u32,
    target_height: u32,
) -> (RgbImage, LetterboxTransform) {
    let original_width = image.width().max(1);
    let original_height = image.height().max(1);
    let scale = (target_width as f32 / original_width as f32)
        .min(target_height as f32 / original_height as f32);
    let resized_width = ((original_width as f32 * scale).round() as u32)
        .max(1)
        .min(target_width);
    let resized_height = ((original_height as f32 * scale).round() as u32)
        .max(1)
        .min(target_height);
    let pad_x = (target_width.saturating_sub(resized_width) / 2) as f32;
    let pad_y = (target_height.saturating_sub(resized_height) / 2) as f32;
    let resized =
        image::imageops::resize(image, resized_width, resized_height, FilterType::Triangle);
    let mut canvas = ImageBuffer::from_pixel(target_width, target_height, Rgb([114, 114, 114]));

    for (x, y, pixel) in resized.enumerate_pixels() {
        canvas.put_pixel(x + pad_x as u32, y + pad_y as u32, *pixel);
    }

    (
        canvas,
        LetterboxTransform {
            scale,
            pad_x,
            pad_y,
            original_width: original_width as f32,
            original_height: original_height as f32,
        },
    )
}

#[cfg(feature = "yolo-inference")]
fn build_input_tensor(image: &RgbImage, layout: InputLayout) -> Result<Array4<f32>, AppError> {
    let height = image.height() as usize;
    let width = image.width() as usize;
    let mut data = match layout {
        InputLayout::Nchw => vec![0.0f32; 3 * height * width],
        InputLayout::Nhwc => vec![0.0f32; height * width * 3],
    };

    for (x, y, pixel) in image.enumerate_pixels() {
        let x = x as usize;
        let y = y as usize;
        match layout {
            InputLayout::Nchw => {
                let index = y * width + x;
                data[index] = pixel[0] as f32 / 255.0;
                data[(height * width) + index] = pixel[1] as f32 / 255.0;
                data[(2 * height * width) + index] = pixel[2] as f32 / 255.0;
            }
            InputLayout::Nhwc => {
                let index = (y * width + x) * 3;
                data[index] = pixel[0] as f32 / 255.0;
                data[index + 1] = pixel[1] as f32 / 255.0;
                data[index + 2] = pixel[2] as f32 / 255.0;
            }
        }
    }

    match layout {
        InputLayout::Nchw => Array4::from_shape_vec((1, 3, height, width), data).map_err(|error| {
            AppError::Message(format!("Failed to build NCHW input tensor: {error}"))
        }),
        InputLayout::Nhwc => Array4::from_shape_vec((1, height, width, 3), data).map_err(|error| {
            AppError::Message(format!("Failed to build NHWC input tensor: {error}"))
        }),
    }
}

#[cfg(feature = "yolo-inference")]
fn decode_candidates(
    shape: &[i64],
    data: &[f32],
    threshold: f32,
    class_names: &[String],
    transform: LetterboxTransform,
) -> Result<Vec<DetectionCandidate>, AppError> {
    let dims = positive_shape(shape)?;
    let class_count = class_names.len();

    let mut detections = match dims.as_slice() {
        [rows, cols] if *cols >= 6 => decode_nms_rows(data, *rows, *cols, threshold, transform),
        [1, rows, cols] if *cols >= 6 && *cols <= 7 => {
            decode_nms_rows(data, *rows, *cols, threshold, transform)
        }
        [1, cols, rows] if *cols >= 6 && *cols <= 7 && *rows > *cols => {
            decode_transposed_nms_rows(data, *rows, *cols, threshold, transform)
        }
        [1, fields, detections] if is_raw_channel_first(*fields, *detections, class_count) => {
            decode_raw_channel_first(
                data,
                *fields,
                *detections,
                class_count,
                threshold,
                transform,
            )?
        }
        [1, detections, fields] if is_raw_row_major(*fields, *detections, class_count) => {
            decode_raw_row_major(
                data,
                *detections,
                *fields,
                class_count,
                threshold,
                transform,
            )?
        }
        _ => {
            return Err(AppError::Message(format!(
                "Unsupported YOLO output shape: {:?}",
                shape
            )))
        }
    };

    detections.sort_by(|left, right| right.confidence.total_cmp(&left.confidence));
    Ok(apply_non_max_suppression(detections, 0.45))
}

#[cfg(feature = "yolo-inference")]
fn positive_shape(shape: &[i64]) -> Result<Vec<usize>, AppError> {
    shape
        .iter()
        .map(|dimension| {
            if *dimension <= 0 {
                return Err(AppError::Message(format!(
                    "Dynamic or invalid ONNX output dimension encountered: {shape:?}"
                )));
            }
            Ok(*dimension as usize)
        })
        .collect()
}

#[cfg(feature = "yolo-inference")]
fn is_raw_channel_first(fields: usize, detections: usize, class_count: usize) -> bool {
    if class_count > 0 {
        return fields == class_count + 4 || fields == class_count + 5;
    }

    detections > 0 && fields > 7 && fields <= 512
}

#[cfg(feature = "yolo-inference")]
fn is_raw_row_major(fields: usize, detections: usize, class_count: usize) -> bool {
    if class_count > 0 {
        return fields == class_count + 4 || fields == class_count + 5;
    }

    detections > 0 && fields > 7 && fields <= 512
}

#[cfg(feature = "yolo-inference")]
fn decode_nms_rows(
    data: &[f32],
    rows: usize,
    cols: usize,
    threshold: f32,
    transform: LetterboxTransform,
) -> Vec<DetectionCandidate> {
    let mut detections = Vec::new();

    for row_index in 0..rows {
        let offset = row_index * cols;
        if offset + cols > data.len() {
            break;
        }

        let row = &data[offset..offset + cols];
        let row = if cols > 6 { &row[cols - 6..] } else { row };
        let confidence = row[4];
        if confidence < threshold {
            continue;
        }

        let class_index = row[5].max(0.0).round() as usize;
        let bbox = if row[2] > row[0] && row[3] > row[1] {
            [row[0], row[1], row[2], row[3]]
        } else {
            xywh_to_xyxy(row[0], row[1], row[2], row[3])
        };

        if let Some(scaled) = scale_bbox(bbox, transform) {
            detections.push(DetectionCandidate {
                class_index,
                confidence,
                bbox: scaled,
            });
        }
    }

    detections
}

#[cfg(feature = "yolo-inference")]
fn decode_transposed_nms_rows(
    data: &[f32],
    rows: usize,
    cols: usize,
    threshold: f32,
    transform: LetterboxTransform,
) -> Vec<DetectionCandidate> {
    let mut detections = Vec::new();

    for row_index in 0..rows {
        let values = (0..cols)
            .map(|column_index| data[(column_index * rows) + row_index])
            .collect::<Vec<_>>();
        let confidence = values[4];
        if confidence < threshold {
            continue;
        }

        let class_index = values[5].max(0.0).round() as usize;
        let bbox = if values[2] > values[0] && values[3] > values[1] {
            [values[0], values[1], values[2], values[3]]
        } else {
            xywh_to_xyxy(values[0], values[1], values[2], values[3])
        };

        if let Some(scaled) = scale_bbox(bbox, transform) {
            detections.push(DetectionCandidate {
                class_index,
                confidence,
                bbox: scaled,
            });
        }
    }

    detections
}

#[cfg(feature = "yolo-inference")]
fn decode_raw_channel_first(
    data: &[f32],
    fields: usize,
    detections: usize,
    class_count: usize,
    threshold: f32,
    transform: LetterboxTransform,
) -> Result<Vec<DetectionCandidate>, AppError> {
    if class_count == 0 {
        return Err(AppError::Message(
            "The selected model does not expose class metadata".into(),
        ));
    }

    let uses_objectness = fields == class_count + 5;
    let class_offset = if uses_objectness { 5 } else { 4 };
    let mut candidates = Vec::new();

    for detection_index in 0..detections {
        let cx = data[detection_index];
        let cy = data[detections + detection_index];
        let width = data[(2 * detections) + detection_index];
        let height = data[(3 * detections) + detection_index];
        let objectness = if uses_objectness {
            data[(4 * detections) + detection_index]
        } else {
            1.0
        };

        let (class_index, class_score) = best_class_score_channel_first(
            data,
            detections,
            class_offset,
            class_count,
            detection_index,
        );
        let confidence = objectness * class_score;
        if confidence < threshold {
            continue;
        }

        if let Some(scaled) = scale_bbox(xywh_to_xyxy(cx, cy, width, height), transform) {
            candidates.push(DetectionCandidate {
                class_index,
                confidence,
                bbox: scaled,
            });
        }
    }

    Ok(candidates)
}

#[cfg(feature = "yolo-inference")]
fn decode_raw_row_major(
    data: &[f32],
    detections: usize,
    fields: usize,
    class_count: usize,
    threshold: f32,
    transform: LetterboxTransform,
) -> Result<Vec<DetectionCandidate>, AppError> {
    if class_count == 0 {
        return Err(AppError::Message(
            "The selected model does not expose class metadata".into(),
        ));
    }

    let uses_objectness = fields == class_count + 5;
    let class_offset = if uses_objectness { 5 } else { 4 };
    let mut candidates = Vec::new();

    for detection_index in 0..detections {
        let offset = detection_index * fields;
        if offset + fields > data.len() {
            break;
        }

        let row = &data[offset..offset + fields];
        let objectness = if uses_objectness { row[4] } else { 1.0 };
        let (class_index, class_score) = best_class_score_row_major(row, class_offset, class_count);
        let confidence = objectness * class_score;
        if confidence < threshold {
            continue;
        }

        if let Some(scaled) = scale_bbox(xywh_to_xyxy(row[0], row[1], row[2], row[3]), transform) {
            candidates.push(DetectionCandidate {
                class_index,
                confidence,
                bbox: scaled,
            });
        }
    }

    Ok(candidates)
}

#[cfg(feature = "yolo-inference")]
fn best_class_score_channel_first(
    data: &[f32],
    detections: usize,
    class_offset: usize,
    class_count: usize,
    detection_index: usize,
) -> (usize, f32) {
    let mut best_index = 0usize;
    let mut best_score = 0.0f32;

    for class_index in 0..class_count {
        let score = data[((class_offset + class_index) * detections) + detection_index];
        if score > best_score {
            best_score = score;
            best_index = class_index;
        }
    }

    (best_index, best_score)
}

#[cfg(feature = "yolo-inference")]
fn best_class_score_row_major(
    row: &[f32],
    class_offset: usize,
    class_count: usize,
) -> (usize, f32) {
    let mut best_index = 0usize;
    let mut best_score = 0.0f32;

    for class_index in 0..class_count {
        let score = row[class_offset + class_index];
        if score > best_score {
            best_score = score;
            best_index = class_index;
        }
    }

    (best_index, best_score)
}

#[cfg(feature = "yolo-inference")]
fn xywh_to_xyxy(center_x: f32, center_y: f32, width: f32, height: f32) -> [f32; 4] {
    [
        center_x - (width / 2.0),
        center_y - (height / 2.0),
        center_x + (width / 2.0),
        center_y + (height / 2.0),
    ]
}

#[cfg(feature = "yolo-inference")]
fn scale_bbox(bbox: [f32; 4], transform: LetterboxTransform) -> Option<[f32; 4]> {
    let mut left = (bbox[0] - transform.pad_x) / transform.scale;
    let mut top = (bbox[1] - transform.pad_y) / transform.scale;
    let mut right = (bbox[2] - transform.pad_x) / transform.scale;
    let mut bottom = (bbox[3] - transform.pad_y) / transform.scale;

    left = left.clamp(0.0, transform.original_width - 1.0);
    top = top.clamp(0.0, transform.original_height - 1.0);
    right = right.clamp(0.0, transform.original_width - 1.0);
    bottom = bottom.clamp(0.0, transform.original_height - 1.0);

    if right <= left || bottom <= top {
        return None;
    }

    Some([left, top, right, bottom])
}

#[cfg(feature = "yolo-inference")]
fn apply_non_max_suppression(
    detections: Vec<DetectionCandidate>,
    iou_threshold: f32,
) -> Vec<DetectionCandidate> {
    let mut kept: Vec<DetectionCandidate> = Vec::new();

    'candidate: for candidate in detections {
        for existing in &kept {
            if candidate.class_index == existing.class_index
                && intersection_over_union(candidate.bbox, existing.bbox) > iou_threshold
            {
                continue 'candidate;
            }
        }
        kept.push(candidate);
    }

    kept
}

#[cfg(feature = "yolo-inference")]
fn intersection_over_union(left: [f32; 4], right: [f32; 4]) -> f32 {
    let overlap_left = left[0].max(right[0]);
    let overlap_top = left[1].max(right[1]);
    let overlap_right = left[2].min(right[2]);
    let overlap_bottom = left[3].min(right[3]);

    if overlap_right <= overlap_left || overlap_bottom <= overlap_top {
        return 0.0;
    }

    let overlap_area = (overlap_right - overlap_left) * (overlap_bottom - overlap_top);
    let left_area = (left[2] - left[0]) * (left[3] - left[1]);
    let right_area = (right[2] - right[0]) * (right[3] - right[1]);
    overlap_area / (left_area + right_area - overlap_area).max(f32::EPSILON)
}

#[cfg(all(test, feature = "yolo-inference"))]
mod tests {
    use super::*;

    fn transform() -> LetterboxTransform {
        LetterboxTransform {
            scale: 1.0,
            pad_x: 0.0,
            pad_y: 0.0,
            original_width: 640.0,
            original_height: 640.0,
        }
    }

    #[test]
    fn decodes_raw_yolo_channel_first_output() {
        let class_names = vec!["person".to_string(), "car".to_string()];
        let shape = vec![1, 6, 2];
        let data = vec![
            100.0, 320.0, // cx
            120.0, 320.0, // cy
            80.0, 80.0, // w
            60.0, 60.0, // h
            0.9, 0.1, // class 0
            0.2, 0.95, // class 1
        ];

        let detections = decode_candidates(&shape, &data, 0.5, &class_names, transform()).unwrap();

        assert_eq!(detections.len(), 2);
        assert_eq!(detections[0].class_index, 1);
        assert!(detections[0].confidence > 0.9);
    }

    #[test]
    fn decodes_nms_output_rows() {
        let class_names = vec!["person".to_string(), "car".to_string()];
        let shape = vec![1, 2, 6];
        let data = vec![
            10.0, 20.0, 110.0, 220.0, 0.88, 0.0, 30.0, 40.0, 90.0, 120.0, 0.35, 1.0,
        ];

        let detections = decode_candidates(&shape, &data, 0.5, &class_names, transform()).unwrap();

        assert_eq!(detections.len(), 1);
        assert_eq!(detections[0].class_index, 0);
        assert_eq!(detections[0].bbox, [10.0, 20.0, 110.0, 220.0]);
    }

    #[test]
    fn suppresses_overlapping_boxes_for_same_class() {
        let detections = vec![
            DetectionCandidate {
                class_index: 0,
                confidence: 0.9,
                bbox: [10.0, 10.0, 110.0, 110.0],
            },
            DetectionCandidate {
                class_index: 0,
                confidence: 0.8,
                bbox: [15.0, 15.0, 105.0, 105.0],
            },
            DetectionCandidate {
                class_index: 1,
                confidence: 0.7,
                bbox: [15.0, 15.0, 105.0, 105.0],
            },
        ];

        let filtered = apply_non_max_suppression(detections, 0.45);

        assert_eq!(filtered.len(), 2);
        assert_eq!(filtered[0].class_index, 0);
        assert_eq!(filtered[1].class_index, 1);
    }
}
