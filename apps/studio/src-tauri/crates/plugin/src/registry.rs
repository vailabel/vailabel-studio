//! The plugin registry and lifecycle state machine.

use std::collections::HashMap;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use vailabel_core::{DomainError, DomainResult};

use crate::capabilities::DetectorPlugin;
use crate::metadata::{PluginKind, PluginMetadata, PluginState};

/// A registered plugin's identity plus its current lifecycle state.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginEntry {
    pub metadata: PluginMetadata,
    pub state: PluginState,
}

/// In-process registry of installed plugins.
///
/// Holds a capability-agnostic list of [`PluginEntry`]s (identity + lifecycle
/// state, used for listing and lifecycle management) and typed maps of the
/// capability plugins for invocation. The lifecycle is a validated
/// `PluginState` machine: `Installed → Loaded → Enabled ⇄ Disabled`, and any of
/// `Loaded`/`Enabled`/`Disabled → Unloaded`.
///
/// Today only detector plugins are wired (the only reference plugin); other
/// capability maps are added when a plugin for them exists.
#[derive(Default)]
pub struct PluginRegistry {
    entries: Vec<PluginEntry>,
    detectors: HashMap<String, Arc<dyn DetectorPlugin>>,
}

impl PluginRegistry {
    /// An empty registry.
    pub fn new() -> Self {
        Self::default()
    }

    /// Register a detector plugin; its lifecycle state starts at `Installed`.
    /// Errors with `Conflict` if a plugin with the same id is already registered.
    pub fn register_detector(&mut self, plugin: Arc<dyn DetectorPlugin>) -> DomainResult<()> {
        let metadata = plugin.metadata().clone();
        let id = metadata.id.clone();
        self.insert_entry(metadata)?;
        self.detectors.insert(id, plugin);
        Ok(())
    }

    fn insert_entry(&mut self, metadata: PluginMetadata) -> DomainResult<()> {
        if self.entries.iter().any(|e| e.metadata.id == metadata.id) {
            return Err(DomainError::conflict(format!(
                "plugin '{}' already registered",
                metadata.id
            )));
        }
        self.entries.push(PluginEntry {
            metadata,
            state: PluginState::Installed,
        });
        Ok(())
    }

    /// Look up a registered detector by id (for invocation).
    pub fn detector(&self, id: &str) -> Option<Arc<dyn DetectorPlugin>> {
        self.detectors.get(id).cloned()
    }

    /// All registered plugins (identity + current lifecycle state).
    pub fn list(&self) -> &[PluginEntry] {
        &self.entries
    }

    /// Registered plugins of a given capability kind.
    pub fn by_kind(&self, kind: PluginKind) -> Vec<&PluginEntry> {
        self.entries
            .iter()
            .filter(|e| e.metadata.kind == kind)
            .collect()
    }

    /// The current lifecycle state of a plugin, if registered.
    pub fn state(&self, id: &str) -> Option<PluginState> {
        self.entries
            .iter()
            .find(|e| e.metadata.id == id)
            .map(|e| e.state)
    }

    /// `Installed → Loaded`.
    pub fn load(&mut self, id: &str) -> DomainResult<()> {
        self.transition(id, PluginState::Loaded)
    }

    /// `Loaded`/`Disabled → Enabled`.
    pub fn enable(&mut self, id: &str) -> DomainResult<()> {
        self.transition(id, PluginState::Enabled)
    }

    /// `Enabled → Disabled`.
    pub fn disable(&mut self, id: &str) -> DomainResult<()> {
        self.transition(id, PluginState::Disabled)
    }

    /// `Loaded`/`Enabled`/`Disabled → Unloaded`.
    pub fn unload(&mut self, id: &str) -> DomainResult<()> {
        self.transition(id, PluginState::Unloaded)
    }

    fn transition(&mut self, id: &str, target: PluginState) -> DomainResult<()> {
        let entry = self
            .entries
            .iter_mut()
            .find(|e| e.metadata.id == id)
            .ok_or_else(|| DomainError::not_found(format!("plugin '{id}'")))?;
        if !transition_allowed(entry.state, target) {
            return Err(DomainError::validation(format!(
                "invalid plugin lifecycle transition {:?} -> {:?} for '{id}'",
                entry.state, target
            )));
        }
        entry.state = target;
        Ok(())
    }
}

/// The allowed lifecycle edges.
fn transition_allowed(from: PluginState, to: PluginState) -> bool {
    use PluginState::*;
    matches!(
        (from, to),
        (Installed, Loaded)
            | (Loaded, Enabled)
            | (Disabled, Enabled)
            | (Enabled, Disabled)
            | (Loaded, Unloaded)
            | (Enabled, Unloaded)
            | (Disabled, Unloaded)
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::capabilities::Plugin;
    use serde_json::{json, Value};

    struct FakeDetector(PluginMetadata);
    impl Plugin for FakeDetector {
        fn metadata(&self) -> &PluginMetadata {
            &self.0
        }
    }
    impl DetectorPlugin for FakeDetector {
        fn detect(&self, _request: &Value) -> DomainResult<Value> {
            Ok(json!({ "detections": [] }))
        }
    }

    fn meta(id: &str) -> PluginMetadata {
        PluginMetadata {
            id: id.to_string(),
            name: id.to_string(),
            version: "1.0".to_string(),
            kind: PluginKind::Detector,
            description: None,
        }
    }

    fn registry_with(id: &str) -> PluginRegistry {
        let mut reg = PluginRegistry::new();
        reg.register_detector(Arc::new(FakeDetector(meta(id)))).unwrap();
        reg
    }

    #[test]
    fn register_list_and_typed_lookup() {
        let reg = registry_with("yolo");
        assert_eq!(reg.list().len(), 1);
        assert_eq!(reg.state("yolo"), Some(PluginState::Installed));
        assert!(reg.detector("yolo").is_some());
        assert!(reg.detector("missing").is_none());
        assert_eq!(reg.by_kind(PluginKind::Detector).len(), 1);
        assert_eq!(reg.by_kind(PluginKind::Segmenter).len(), 0);
    }

    #[test]
    fn duplicate_registration_is_conflict() {
        let mut reg = registry_with("yolo");
        assert!(reg
            .register_detector(Arc::new(FakeDetector(meta("yolo"))))
            .is_err());
    }

    #[test]
    fn valid_lifecycle_path() {
        let mut reg = registry_with("yolo");
        reg.load("yolo").unwrap();
        reg.enable("yolo").unwrap();
        reg.disable("yolo").unwrap();
        reg.enable("yolo").unwrap();
        reg.unload("yolo").unwrap();
        assert_eq!(reg.state("yolo"), Some(PluginState::Unloaded));
    }

    #[test]
    fn invalid_transition_and_unknown_id_rejected() {
        let mut reg = registry_with("yolo");
        // Installed -> Enabled is not allowed (must Load first).
        assert!(reg.enable("yolo").is_err());
        assert_eq!(reg.state("yolo"), Some(PluginState::Installed));
        // Unknown plugin id.
        assert!(reg.load("ghost").is_err());
    }
}
