//! Plugin-framework commands — thin dispatchers over the registry in `AppState`.

use serde_json::Value;

/// List the registered plugins (identity + lifecycle state) for the UI.
#[tauri::command]
pub fn plugins_list(state: tauri::State<crate::AppState>) -> Result<Value, crate::AppError> {
    let registry = state
        .plugin_registry
        .lock()
        .map_err(|_| crate::AppError::Message("Plugin registry unavailable".into()))?;
    Ok(serde_json::to_value(registry.list())?)
}
