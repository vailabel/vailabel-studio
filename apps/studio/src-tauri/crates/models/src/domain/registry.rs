//! Local model registry — the catalog of models the AI assistant knows about.
//!
//! Each [`RegistryModel`] declares a model's task, the high-level capabilities
//! it unlocks, the ONNX components + tokenizer it requires, and whether its
//! inference engine is wired (`available`) or scaffolded (`planned`). This is the
//! single source of truth driving the React "AI Assistant" UI and the binary's
//! plugin dispatch. Pure data — adding real inference for a model = implement its
//! plugin in the binary and flip its `status` here to `"available"`.

use serde_json::{json, Value};

#[derive(Clone, Copy)]
pub struct RegistryModel {
    pub id: &'static str,
    pub name: &'static str,
    pub family: &'static str,
    /// detection | segmentation | prompt_detection | embedding | captioning
    pub task: &'static str,
    /// Subset of: click_to_segment, prompt_to_detect, auto_polygon,
    /// auto_bounding_box, batch_auto_labeling.
    pub capabilities: &'static [&'static str],
    pub description: &'static str,
    pub params: &'static str,
    pub onnx_components: &'static [&'static str],
    pub needs_tokenizer: bool,
    pub source: &'static str,
    /// available | planned
    pub status: &'static str,
}

pub const REGISTRY: &[RegistryModel] = &[
    RegistryModel {
        id: "yolo-detection",
        name: "YOLO (Object Detection)",
        family: "yolo",
        task: "detection",
        capabilities: &["auto_bounding_box", "batch_auto_labeling"],
        description: "Closed-vocabulary object detection. Already wired: produces bounding-box predictions you can review and accept.",
        params: "varies (n/s/m/l/x)",
        onnx_components: &["model.onnx"],
        needs_tokenizer: false,
        source: "Ultralytics releases (built-in catalog)",
        status: "available",
    },
    RegistryModel {
        id: "mobile-sam",
        name: "MobileSAM",
        family: "sam",
        task: "segmentation",
        capabilities: &["click_to_segment", "auto_polygon"],
        description: "Lightweight Segment Anything. Click a point to segment an object and auto-generate a polygon. Lightest first segmentation target.",
        params: "~10M encoder + decoder",
        onnx_components: &["image_encoder.onnx", "mask_decoder.onnx"],
        needs_tokenizer: false,
        source: "MobileSAM ONNX export",
        status: "available",
    },
    RegistryModel {
        id: "sam2",
        name: "SAM 2",
        family: "sam",
        task: "segmentation",
        capabilities: &["click_to_segment", "auto_polygon"],
        description: "Segment Anything 2. Higher-quality interactive segmentation; heavier than MobileSAM.",
        params: "~38M+ (tiny..large)",
        onnx_components: &["image_encoder.onnx", "mask_decoder.onnx"],
        needs_tokenizer: false,
        source: "SAM 2 ONNX export",
        status: "planned",
    },
    RegistryModel {
        id: "grounding-dino",
        name: "Grounding DINO",
        family: "grounding-dino",
        task: "prompt_detection",
        capabilities: &["prompt_to_detect", "auto_bounding_box"],
        description: "Open-vocabulary detection from a free-text prompt. Requires a BERT text tokenizer.",
        params: "~172M (tiny)",
        onnx_components: &["grounding_dino.onnx"],
        needs_tokenizer: true,
        source: "IDEA-Research / ONNX export",
        status: "planned",
    },
    RegistryModel {
        id: "florence-2",
        name: "Florence-2",
        family: "florence",
        task: "captioning",
        capabilities: &["prompt_to_detect", "auto_bounding_box", "auto_polygon"],
        description: "Vision-language model: grounded detection, captioning and region proposals from task prompts. Seq2seq — the most complex to wire.",
        params: "~230M (base)",
        onnx_components: &[
            "vision_encoder.onnx",
            "encoder_model.onnx",
            "decoder_model.onnx",
            "embed_tokens.onnx",
        ],
        needs_tokenizer: true,
        source: "microsoft/Florence-2 ONNX export",
        status: "planned",
    },
    RegistryModel {
        id: "yolo-world",
        name: "YOLO-World",
        family: "yolo-world",
        task: "prompt_detection",
        capabilities: &["prompt_to_detect", "auto_bounding_box", "batch_auto_labeling"],
        description: "Open-vocabulary YOLO: a re-parameterized fixed-vocabulary export runs through the existing detector; the copilot narrows its broad vocabulary to the requested phrase.",
        params: "~50M+",
        onnx_components: &["yolo_world.onnx"],
        needs_tokenizer: false,
        source: "Ultralytics YOLO-World export (fixed vocabulary)",
        status: "available",
    },
    RegistryModel {
        id: "clip",
        name: "CLIP",
        family: "clip",
        task: "embedding",
        capabilities: &[],
        description: "Image/text embedding backbone. Powers zero-shot classification and the text side of open-vocabulary detectors (e.g. YOLO-World).",
        params: "~150M (ViT-B/32)",
        onnx_components: &["clip_image.onnx", "clip_text.onnx"],
        needs_tokenizer: true,
        source: "openai/CLIP ONNX export",
        status: "planned",
    },
];

fn model_json(m: &RegistryModel) -> Value {
    json!({
        "id": m.id,
        "name": m.name,
        "family": m.family,
        "task": m.task,
        "capabilities": m.capabilities,
        "description": m.description,
        "params": m.params,
        "onnxComponents": m.onnx_components,
        "needsTokenizer": m.needs_tokenizer,
        "source": m.source,
        "status": m.status,
    })
}

/// The registry as a JSON array for the `ai_model_registry` command.
pub fn registry_json() -> Vec<Value> {
    REGISTRY.iter().map(model_json).collect()
}

/// Look up a registry entry by id (used by the plugin dispatcher).
pub fn find(id: &str) -> Option<&'static RegistryModel> {
    REGISTRY.iter().find(|m| m.id == id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn find_resolves_known_ids_and_json_covers_all() {
        assert_eq!(find("mobile-sam").map(|m| m.task), Some("segmentation"));
        assert_eq!(find("yolo-detection").map(|m| m.status), Some("available"));
        assert!(find("does-not-exist").is_none());
        assert_eq!(registry_json().len(), REGISTRY.len());
    }
}
