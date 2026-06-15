//! Composition-root plugin implementations + the `plugins_list` command.
//!
//! Concrete plugins live in the binary because they bridge the pure plugin
//! framework to infrastructure (here, the `runtime-manager` ACL). The registry
//! itself is built and owned in `run()` and held in `AppState`.

use std::sync::Arc;

use serde_json::Value;
use vailabel_core::{DomainError, DomainResult};
use vailabel_plugin::{DetectorPlugin, Plugin, PluginKind, PluginMetadata};

use runtime_manager::{DetectRequest, RuntimeService};

/// A detector plugin backed by the embedded Python/FastAPI runtime.
///
/// Bridges the plugin framework to the runtime ACL: it parses the request JSON
/// into a [`DetectRequest`], runs detection over the (lazily-started) runtime,
/// and returns the response as JSON. This is the reference plugin proving the
/// framework supports a real, runtime-backed capability.
pub struct RuntimeDetectorPlugin {
    metadata: PluginMetadata,
    runtime: Arc<RuntimeService>,
}

impl RuntimeDetectorPlugin {
    /// Build the plugin over the shared runtime service.
    pub fn new(runtime: Arc<RuntimeService>) -> Self {
        Self {
            metadata: PluginMetadata {
                id: "runtime-detector".to_string(),
                name: "Runtime object detector".to_string(),
                version: "1.0".to_string(),
                kind: PluginKind::Detector,
                description: Some(
                    "Object detection via the embedded Python/FastAPI runtime.".to_string(),
                ),
            },
            runtime,
        }
    }
}

impl Plugin for RuntimeDetectorPlugin {
    fn metadata(&self) -> &PluginMetadata {
        &self.metadata
    }
}

impl DetectorPlugin for RuntimeDetectorPlugin {
    fn detect(&self, request: &Value) -> DomainResult<Value> {
        let req: DetectRequest = serde_json::from_value(request.clone())
            .map_err(|e| DomainError::validation(e.to_string()))?;
        let runtime = self.runtime.clone();
        // The runtime client is async; bridge to this sync capability method.
        // (Registered/listed in Phase 4, not yet invoked from an async command.)
        let resp = tauri::async_runtime::block_on(async move {
            let client = runtime
                .ensure_started()
                .await
                .map_err(|e| DomainError::repository(e.to_string()))?;
            client
                .detect(&req)
                .await
                .map_err(|e| DomainError::repository(e.to_string()))
        })?;
        serde_json::to_value(resp).map_err(|e| DomainError::repository(e.to_string()))
    }
}

/// List the registered plugins (identity + lifecycle state) for the UI.
#[tauri::command]
pub fn plugins_list(state: tauri::State<crate::AppState>) -> Result<Value, crate::AppError> {
    let registry = state
        .plugin_registry
        .lock()
        .map_err(|_| crate::AppError::Message("Plugin registry unavailable".into()))?;
    Ok(serde_json::to_value(registry.list())?)
}
