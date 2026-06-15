//! Resolving a model's class labels — from a parsed config blob (array, nested
//! object, or numeric-keyed map) or a built-in family table. Pure.

use serde_json::{Map, Value};

const COCO_80_CLASS_NAMES: &[&str] = &[
    "person",
    "bicycle",
    "car",
    "motorcycle",
    "airplane",
    "bus",
    "train",
    "truck",
    "boat",
    "traffic light",
    "fire hydrant",
    "stop sign",
    "parking meter",
    "bench",
    "bird",
    "cat",
    "dog",
    "horse",
    "sheep",
    "cow",
    "elephant",
    "bear",
    "zebra",
    "giraffe",
    "backpack",
    "umbrella",
    "handbag",
    "tie",
    "suitcase",
    "frisbee",
    "skis",
    "snowboard",
    "sports ball",
    "kite",
    "baseball bat",
    "baseball glove",
    "skateboard",
    "surfboard",
    "tennis racket",
    "bottle",
    "wine glass",
    "cup",
    "fork",
    "knife",
    "spoon",
    "bowl",
    "banana",
    "apple",
    "sandwich",
    "orange",
    "broccoli",
    "carrot",
    "hot dog",
    "pizza",
    "donut",
    "cake",
    "chair",
    "couch",
    "potted plant",
    "bed",
    "dining table",
    "toilet",
    "tv",
    "laptop",
    "mouse",
    "remote",
    "keyboard",
    "cell phone",
    "microwave",
    "oven",
    "toaster",
    "sink",
    "refrigerator",
    "book",
    "clock",
    "vase",
    "scissors",
    "teddy bear",
    "hair drier",
    "toothbrush",
];

/// Trim + drop blanks; `None` when nothing usable remains.
pub fn normalize_class_names(names: Vec<String>) -> Option<Vec<String>> {
    let normalized = names
        .into_iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();

    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

/// Class names from a JSON array of strings or `{ "name": ... }` objects.
pub fn extract_named_value_list(entries: &[Value]) -> Option<Vec<String>> {
    let values = entries
        .iter()
        .map(|value| {
            value.as_str().map(ToString::to_string).or_else(|| {
                value
                    .get("name")
                    .and_then(Value::as_str)
                    .map(ToString::to_string)
            })
        })
        .collect::<Option<Vec<String>>>()?;

    normalize_class_names(values)
}

/// Class names from a numeric-keyed map (`{ "0": "person", "1": "car" }`),
/// ordered by key.
pub fn extract_named_value_map(entries: &Map<String, Value>) -> Option<Vec<String>> {
    let mut numbered_entries = entries
        .iter()
        .filter_map(|(key, value)| Some((key.parse::<usize>().ok()?, value.as_str()?)))
        .collect::<Vec<_>>();
    numbered_entries.sort_by_key(|(index, _)| *index);

    if numbered_entries.is_empty() {
        return None;
    }

    normalize_class_names(
        numbered_entries
            .into_iter()
            .map(|(_, value)| value.to_string())
            .collect(),
    )
}

/// Recursively pull class names from a parsed config value, probing the common
/// keys (`classNames`/`names`/`labels`/…) before falling back to a numeric map.
pub fn extract_class_names_from_value(value: &Value) -> Option<Vec<String>> {
    match value {
        Value::Array(entries) => extract_named_value_list(entries),
        Value::Object(entries) => {
            for key in ["classNames", "class_names", "names", "labels", "classes"] {
                if let Some(candidate) = entries.get(key).and_then(extract_class_names_from_value) {
                    return Some(candidate);
                }
            }
            extract_named_value_map(entries)
        }
        _ => None,
    }
}

/// Built-in labels for known families (COCO-80 for YOLO detection), or `None`.
pub fn builtin_class_names(family: &str, category: &str) -> Option<Vec<String>> {
    if category.eq_ignore_ascii_case("detection")
        && matches!(
            family.trim().to_ascii_lowercase().as_str(),
            "yolo26" | "yolo11" | "yolov8"
        )
    {
        return Some(
            COCO_80_CLASS_NAMES
                .iter()
                .map(|value| value.to_string())
                .collect(),
        );
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn extracts_from_array_object_and_numeric_map() {
        assert_eq!(
            extract_class_names_from_value(&json!(["car", " ", "dog"])),
            Some(vec!["car".into(), "dog".into()])
        );
        assert_eq!(
            extract_class_names_from_value(&json!({ "names": { "1": "b", "0": "a" } })),
            Some(vec!["a".into(), "b".into()])
        );
        assert_eq!(extract_class_names_from_value(&json!({})), None);
    }

    #[test]
    fn builtin_only_for_known_detection_families() {
        assert_eq!(builtin_class_names("yolo26", "detection").map(|c| c.len()), Some(80));
        assert_eq!(builtin_class_names("yolo26", "segmentation"), None);
        assert_eq!(builtin_class_names("random", "detection"), None);
    }
}
