//! Cross-cutting JSON helpers used by the binary-side services that still shape
//! `serde_json::Value` before handing it to a typed module aggregate. Re-exported
//! from the crate root, so call sites keep using `crate::now_iso`, `crate::value_string`, etc.
//! (Per-kind defaulting now lives in the aggregates themselves — see each crate's
//! domain `#[serde(default …)]`; this module no longer normalizes.)

use serde_json::{Map, Value};

use crate::AppError;

pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

pub(crate) fn as_object_mut(value: &mut Value) -> Result<&mut Map<String, Value>, AppError> {
    value
        .as_object_mut()
        .ok_or_else(|| AppError::Message("Expected object payload".into()))
}

pub(crate) fn merge_patch(target: &mut Value, patch: &Value) {
    match (target, patch) {
        (Value::Object(target_map), Value::Object(patch_map)) => {
            for (key, patch_value) in patch_map {
                if patch_value.is_null() {
                    target_map.remove(key);
                } else {
                    merge_patch(target_map.entry(key).or_insert(Value::Null), patch_value);
                }
            }
        }
        (target_value, patch_value) => {
            *target_value = patch_value.clone();
        }
    }
}

pub(crate) fn value_string(value: &Value, camel: &str, snake: &str) -> Option<String> {
    value
        .get(camel)
        .or_else(|| value.get(snake))
        .and_then(Value::as_str)
        .map(ToString::to_string)
}
