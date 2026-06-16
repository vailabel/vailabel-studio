//! Pure YOLO ⇄ studio-annotation conversion: the geometry/format math shared by
//! the dataset export and import flows.
//!
//! No filesystem or transport here — the composition-root `DatasetService` owns
//! the folder walking / file writing and calls these. (Dataset-*folder* parsing —
//! `data.yaml` names, class files, image globbing — stays with that I/O, since it
//! reads the disk.)

use std::collections::HashMap;

use serde::Serialize;
use serde_json::Value;

/// Read a field trying camelCase then snake_case.
pub fn field<'a>(v: &'a Value, camel: &str, snake: &str) -> Option<&'a Value> {
    v.get(camel).or_else(|| v.get(snake))
}

/// Read a string field trying camelCase then snake_case.
pub fn str_field<'a>(v: &'a Value, camel: &str, snake: &str) -> Option<&'a str> {
    field(v, camel, snake).and_then(Value::as_str)
}

/// The `data.yaml` ultralytics consumes as `data=` (serialized by the caller).
#[derive(Debug, Serialize)]
pub struct DataYaml {
    pub path: String,
    pub train: String,
    pub val: String,
    pub nc: usize,
    pub names: Vec<String>,
}

/// Resolve an annotation to a class index: prefer the label id, fall back to a
/// case-insensitive match on the annotation's name against the label vocabulary.
pub fn class_index_of(
    ann: &Value,
    id_to_index: &HashMap<String, usize>,
    name_to_index: &HashMap<String, usize>,
) -> Option<usize> {
    if let Some(id) = str_field(ann, "labelId", "label_id") {
        if let Some(idx) = id_to_index.get(id) {
            return Some(*idx);
        }
    }
    for key in ["name", "label"] {
        if let Some(name) = ann.get(key).and_then(Value::as_str) {
            if let Some(idx) = name_to_index.get(&name.trim().to_lowercase()) {
                return Some(*idx);
            }
        }
    }
    None
}

/// Pixel-space bounding box `(x0, y0, x1, y1)` for any annotation shape. Boxes
/// use their two corners; polygons / lines / freehand use the bbox of all
/// points; a circle uses center±radius; points have no area.
fn bbox_pixels(ann_type: &str, coords: &[Value]) -> Option<(f64, f64, f64, f64)> {
    let pts: Vec<(f64, f64)> = coords
        .iter()
        .filter_map(|p| Some((p.get("x")?.as_f64()?, p.get("y")?.as_f64()?)))
        .collect();
    if pts.is_empty() {
        return None;
    }

    let ty = ann_type.trim().to_lowercase();
    if ty == "point" {
        return None;
    }
    if ty == "circle" && pts.len() >= 2 {
        let (cx, cy) = pts[0];
        let r = ((pts[1].0 - cx).powi(2) + (pts[1].1 - cy).powi(2)).sqrt();
        return Some((cx - r, cy - r, cx + r, cy + r));
    }

    let x0 = pts.iter().map(|p| p.0).fold(f64::INFINITY, f64::min);
    let y0 = pts.iter().map(|p| p.1).fold(f64::INFINITY, f64::min);
    let x1 = pts.iter().map(|p| p.0).fold(f64::NEG_INFINITY, f64::max);
    let y1 = pts.iter().map(|p| p.1).fold(f64::NEG_INFINITY, f64::max);
    Some((x0, y0, x1, y1))
}

/// One normalized YOLO line `"<cls> <cx> <cy> <w> <h>"`, or `None` if the
/// annotation has no resolvable class / no usable area within the image.
pub fn annotation_to_yolo_line(
    ann: &Value,
    class_idx: usize,
    width: f64,
    height: f64,
) -> Option<String> {
    if width <= 0.0 || height <= 0.0 {
        return None;
    }
    let ann_type = str_field(ann, "type", "annotation_type").unwrap_or("box");
    let coords = field(ann, "coordinates", "coordinates")?.as_array()?;
    let (x0, y0, x1, y1) = bbox_pixels(ann_type, coords)?;

    let cx = ((x0 + x1) / 2.0 / width).clamp(0.0, 1.0);
    let cy = ((y0 + y1) / 2.0 / height).clamp(0.0, 1.0);
    let bw = ((x1 - x0).abs() / width).clamp(0.0, 1.0);
    let bh = ((y1 - y0).abs() / height).clamp(0.0, 1.0);
    if bw <= 0.0 || bh <= 0.0 {
        return None;
    }
    Some(format!("{class_idx} {cx:.6} {cy:.6} {bw:.6} {bh:.6}"))
}

/// Parse one YOLO label line into `(class_index, annotation_type, pixel_points)`.
/// `<cls> cx cy w h` → a 2-corner box; `<cls> x1 y1 x2 y2 …` (segmentation) →
/// a polygon. Coordinates are normalized [0,1]; we scale them to pixels here.
pub fn parse_yolo_line(
    line: &str,
    width: f64,
    height: f64,
) -> Option<(usize, &'static str, Vec<(f64, f64)>)> {
    let toks: Vec<f64> = line
        .split_whitespace()
        .map(|t| t.parse::<f64>())
        .collect::<Result<Vec<_>, _>>()
        .ok()?;
    if toks.len() < 5 || width <= 0.0 || height <= 0.0 {
        return None;
    }
    let class_idx = toks[0].max(0.0) as usize;
    let rest = &toks[1..];

    if rest.len() == 4 {
        let (cx, cy, w, h) = (rest[0], rest[1], rest[2], rest[3]);
        let x0 = ((cx - w / 2.0) * width).clamp(0.0, width);
        let y0 = ((cy - h / 2.0) * height).clamp(0.0, height);
        let x1 = ((cx + w / 2.0) * width).clamp(0.0, width);
        let y1 = ((cy + h / 2.0) * height).clamp(0.0, height);
        if x1 <= x0 || y1 <= y0 {
            return None;
        }
        return Some((class_idx, "box", vec![(x0, y0), (x1, y1)]));
    }

    if rest.len() >= 6 && rest.len() % 2 == 0 {
        let pts: Vec<(f64, f64)> = rest
            .chunks(2)
            .map(|c| {
                (
                    (c[0] * width).clamp(0.0, width),
                    (c[1] * height).clamp(0.0, height),
                )
            })
            .collect();
        return Some((class_idx, "polygon", pts));
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn box_two_corners_normalizes_to_center_and_size() {
        let ann = json!({
            "type": "box",
            "coordinates": [{ "x": 100.0, "y": 50.0 }, { "x": 300.0, "y": 250.0 }],
        });
        // image 400x400 → cx=200/400=0.5, cy=150/400=0.375, w=200/400=0.5, h=200/400=0.5
        let line = annotation_to_yolo_line(&ann, 3, 400.0, 400.0).unwrap();
        assert_eq!(line, "3 0.500000 0.375000 0.500000 0.500000");
    }

    #[test]
    fn box_corners_in_any_order_give_positive_size() {
        // bottom-right listed first, top-left second.
        let ann = json!({
            "type": "box",
            "coordinates": [{ "x": 300.0, "y": 250.0 }, { "x": 100.0, "y": 50.0 }],
        });
        let line = annotation_to_yolo_line(&ann, 0, 400.0, 400.0).unwrap();
        assert_eq!(line, "0 0.500000 0.375000 0.500000 0.500000");
    }

    #[test]
    fn polygon_uses_bounding_box_of_all_points() {
        let ann = json!({
            "type": "polygon",
            "coordinates": [
                { "x": 10.0, "y": 20.0 },
                { "x": 60.0, "y": 20.0 },
                { "x": 35.0, "y": 70.0 }
            ],
        });
        // bbox = (10,20)-(60,70); on 100x100 → cx=0.35, cy=0.45, w=0.5, h=0.5
        let line = annotation_to_yolo_line(&ann, 1, 100.0, 100.0).unwrap();
        assert_eq!(line, "1 0.350000 0.450000 0.500000 0.500000");
    }

    #[test]
    fn point_has_no_area_and_is_skipped() {
        let ann = json!({ "type": "point", "coordinates": [{ "x": 10.0, "y": 10.0 }] });
        assert!(annotation_to_yolo_line(&ann, 0, 100.0, 100.0).is_none());
    }

    #[test]
    fn out_of_bounds_box_is_clamped() {
        let ann = json!({
            "type": "box",
            "coordinates": [{ "x": -50.0, "y": -50.0 }, { "x": 150.0, "y": 150.0 }],
        });
        // clamps center/size into [0,1]; never panics, always emits a line.
        let line = annotation_to_yolo_line(&ann, 0, 100.0, 100.0).unwrap();
        assert!(line.starts_with("0 "));
    }

    #[test]
    fn class_resolves_by_label_id_then_by_name() {
        let mut by_id = HashMap::new();
        by_id.insert("lbl-1".to_string(), 2usize);
        let mut by_name = HashMap::new();
        by_name.insert("car".to_string(), 5usize);

        let by_id_ann = json!({ "labelId": "lbl-1", "name": "ignored" });
        assert_eq!(class_index_of(&by_id_ann, &by_id, &by_name), Some(2));

        let by_name_ann = json!({ "name": "Car" });
        assert_eq!(class_index_of(&by_name_ann, &by_id, &by_name), Some(5));

        let unknown = json!({ "name": "tree" });
        assert_eq!(class_index_of(&unknown, &by_id, &by_name), None);
    }

    #[test]
    fn yolo_box_line_maps_back_to_pixel_corners() {
        // Inverse of `box_two_corners_normalizes_to_center_and_size`:
        // cls 3, cx=.5 cy=.375 w=.5 h=.5 on 400x400 → corners (100,50)-(300,250).
        let (idx, ty, pts) = parse_yolo_line("3 0.5 0.375 0.5 0.5", 400.0, 400.0).unwrap();
        assert_eq!(idx, 3);
        assert_eq!(ty, "box");
        assert_eq!(pts.len(), 2);
        assert!((pts[0].0 - 100.0).abs() < 1e-6);
        assert!((pts[0].1 - 50.0).abs() < 1e-6);
        assert!((pts[1].0 - 300.0).abs() < 1e-6);
        assert!((pts[1].1 - 250.0).abs() < 1e-6);
    }

    #[test]
    fn yolo_segmentation_line_maps_to_polygon() {
        let (idx, ty, pts) = parse_yolo_line("1 0.1 0.2 0.6 0.2 0.35 0.7", 100.0, 100.0).unwrap();
        assert_eq!(idx, 1);
        assert_eq!(ty, "polygon");
        assert_eq!(pts.len(), 3);
        assert!((pts[0].0 - 10.0).abs() < 1e-6);
        assert!((pts[2].1 - 70.0).abs() < 1e-6);
    }

    #[test]
    fn yolo_line_with_too_few_tokens_is_rejected() {
        assert!(parse_yolo_line("0 0.5 0.5", 100.0, 100.0).is_none());
    }
}
