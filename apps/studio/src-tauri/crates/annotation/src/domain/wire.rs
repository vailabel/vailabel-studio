//! Wire-format helper.
//!
//! The frontend reads some fields by camelCase and some by snake_case (e.g.
//! `project-detail-viewmodel` reads `annotation.image_id`, the Label Studio
//! adapter reads `prediction.model_version`). The residual store emitted BOTH
//! casings for every aliased field; to keep those readers working, the typed
//! aggregates serialize camelCase and then mirror the aliased keys to snake_case
//! via [`with_snake_aliases`].

use serde_json::Value;

/// Copy each `camel` key to its `snake` alias, reproducing the residual store's
/// dual-key JSON output. Overwrites any existing snake key so the two always
/// agree.
pub(crate) fn with_snake_aliases(mut value: Value, pairs: &[(&str, &str)]) -> Value {
    if let Value::Object(map) = &mut value {
        for (camel, snake) in pairs {
            if let Some(found) = map.get(*camel).cloned() {
                map.insert((*snake).to_string(), found);
            }
        }
    }
    value
}
