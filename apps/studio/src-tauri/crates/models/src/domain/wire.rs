//! Wire-format helper: mirror camelCase keys to their snake_case aliases so the
//! typed aggregates reproduce the residual store's dual-key JSON output (some
//! frontend readers, e.g. the Label Studio adapter, read `model_version` etc. by
//! snake_case).

use serde_json::Value;

/// Copy each `camel` key to its `snake` alias, overwriting any existing snake key.
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
