//! Inferring a model's identity from its name + file path: extension/runtime,
//! Ultralytics family/variant/task, default registry rank, and the display
//! version string. Pure (string + `std::path` logic only).

use std::path::Path;

/// Lowercased file extension (no dot), or empty.
pub fn model_extension(model_path: &Path) -> String {
    model_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
}

/// A PyTorch checkpoint (`.pt`/`.pth`) — needs ONNX export before local inference.
pub fn is_pytorch_checkpoint(model_path: &Path) -> bool {
    matches!(model_extension(model_path).as_str(), "pt" | "pth")
}

/// Ultralytics-style filename suffix → task, authoritative over the installed
/// category (a `-cls`/`-seg`/`-pose` asset is that task even if it was downloaded
/// under a "detection" catalog entry). Returns `None` for plain detectors.
pub fn task_suffix(model_path: &Path) -> Option<&'static str> {
    let name = model_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_lowercase();
    if name.contains("-cls") || name.contains("_cls") {
        Some("classification")
    } else if name.contains("-pose") || name.contains("_pose") {
        Some("pose")
    } else if name.contains("-seg") || name.contains("_seg") {
        Some("segmentation")
    } else {
        None
    }
}

/// Accurate, role-aware reason a model can't run the box detector — segmentation
/// models are usable (via the copilot), classification/pose are different tasks.
pub fn non_detection_reason(task: &str) -> String {
    match task {
        "segmentation" => "Segmentation model \u{2014} used by the AI Copilot for click/box \u{2192} polygon (ask it to \u{201c}outline them\u{201d}), not the Detect button.",
        "classification" => "Classification model \u{2014} it labels the whole image, not regions. Install a detection model (e.g. YOLO26 Detection) to draw boxes.",
        "pose" => "Pose-estimation model \u{2014} not a box detector. Install a detection model for AI detect.",
        _ => "AI detect supports object-detection models; this model uses a different task.",
    }
    .to_string()
}

/// Best-effort `(family, variant)` from a model's name + filename
/// (e.g. "YOLO26n" → `("yolo26", "n")`).
pub fn infer_model_family_and_variant(name: &str, model_path: &Path) -> (String, String) {
    let haystack = format!(
        "{} {}",
        name.to_ascii_lowercase(),
        model_path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase()
    );

    let family = if haystack.contains("yoloe-26") {
        "yoloe-26"
    } else if haystack.contains("yolo26") {
        "yolo26"
    } else if haystack.contains("yolo11") {
        "yolo11"
    } else if haystack.contains("yolov8") {
        "yolov8"
    } else {
        ""
    };

    let variant = ["n", "s", "m", "l", "x"]
        .iter()
        .copied()
        .find(|variant| {
            haystack.contains(&format!("yolo26{variant}"))
                || haystack.contains(&format!("yoloe-26{variant}"))
        })
        .unwrap_or_default();

    (family.to_string(), variant.to_string())
}

/// Default sort rank for a model in the registry (lower = preferred).
pub fn infer_default_rank(family: &str, category: &str, variant: &str) -> i64 {
    if family == "yolo26" && category == "detection" {
        match variant {
            "n" => 0,
            "s" => 10,
            "m" => 20,
            "l" => 30,
            "x" => 40,
            _ => 100,
        }
    } else if family == "yolo26" {
        50
    } else if family == "yoloe-26" {
        100
    } else {
        999
    }
}

/// `(format, runtime)` for a model file by extension.
pub fn infer_model_runtime(model_path: &Path) -> (&'static str, &'static str) {
    match model_extension(model_path).as_str() {
        "onnx" => ("onnx", "ort"),
        "pt" | "pth" => ("pytorch", "cpu"),
        "tflite" => ("tflite", "cpu"),
        "h5" => ("keras", "cpu"),
        "pb" => ("tensorflow", "cpu"),
        _ => ("unknown", "cpu"),
    }
}

/// The canonical task-type tag for a category.
pub fn task_type_for_category(category: &str) -> &'static str {
    match category {
        "segmentation" => "segmentation",
        "classification" => "classification",
        "pose" => "pose_estimation",
        "tracking" => "tracking",
        _ => "object_detection",
    }
}

/// Display version string for an installed model (family-aware, else `name version`).
pub fn build_model_version(
    name: &str,
    version: &str,
    family: &str,
    variant: &str,
    category: &str,
) -> String {
    if !family.is_empty() && !variant.is_empty() {
        let base = if family == "yoloe-26" {
            format!("YOLOE-26{variant}")
        } else {
            format!("YOLO26{variant}")
        };

        return match category {
            "segmentation" => format!("{base}-seg"),
            "pose" => format!("{base}-pose"),
            _ => base,
        };
    }
    format!("{name} {version}")
}

/// Singular/plural-tolerant equality for two already-lowercased class tokens.
pub fn class_token_matches(a: &str, b: &str) -> bool {
    if a.is_empty() || b.is_empty() {
        return false;
    }
    a == b || format!("{a}s") == b || format!("{b}s") == a
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn infers_family_variant_and_runtime() {
        let (family, variant) = infer_model_family_and_variant("YOLO26n", Path::new("yolo26n.onnx"));
        assert_eq!((family.as_str(), variant.as_str()), ("yolo26", "n"));
        assert_eq!(infer_model_runtime(Path::new("m.onnx")), ("onnx", "ort"));
        assert_eq!(infer_default_rank("yolo26", "detection", "n"), 0);
    }

    #[test]
    fn task_suffix_overrides_category() {
        assert_eq!(task_suffix(Path::new("yolo11n-seg.onnx")), Some("segmentation"));
        assert_eq!(task_suffix(Path::new("yolo11n.onnx")), None);
    }

    #[test]
    fn class_tokens_are_plural_tolerant() {
        assert!(class_token_matches("car", "cars"));
        assert!(class_token_matches("cats", "cat"));
        assert!(!class_token_matches("car", "dog"));
    }

    #[test]
    fn version_string_is_family_aware() {
        assert_eq!(build_model_version("x", "1", "yolo26", "n", "segmentation"), "YOLO26n-seg");
        assert_eq!(build_model_version("Custom", "2.0", "", "", "detection"), "Custom 2.0");
    }
}
