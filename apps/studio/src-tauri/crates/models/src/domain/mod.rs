//! Pure model-domain logic, extracted from the binary's `AiService`.
//!
//! - [`class_names`] — resolving a model's class labels from a config blob or a
//!   built-in family table.
//! - [`identity`] — inferring a model's family/variant/rank/runtime and its
//!   registry version string from its name + file path.
//!
//! All pure: depends only on `serde_json` + `std::path`. No filesystem, ONNX,
//! HTTP, or feature gates (the feature-gated `prediction_unsupported_reason`
//! stays in the binary and calls these).

pub mod class_names;
pub mod identity;

pub use class_names::{
    builtin_class_names, extract_class_names_from_value, extract_named_value_list,
    extract_named_value_map, normalize_class_names,
};
pub use identity::{
    build_model_version, class_token_matches, infer_default_rank, infer_model_family_and_variant,
    infer_model_runtime, is_pytorch_checkpoint, model_extension, non_detection_reason, task_suffix,
    task_type_for_category,
};
