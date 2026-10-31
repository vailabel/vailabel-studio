//! Training agents registered in Studio, and the per-run metadata that says
//! where a run trains.
//!
//! An agent is a `vailabel-agent` service on another machine. Its name and
//! address live in the `trainingAgents` setting (a JSON list the Settings UI
//! edits); its access token lives only in the OS keychain.

use std::sync::Arc;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use vailabel_agent_client::AgentClient;
use vailabel_workspace::domain::SettingRepository;

use crate::AppError;

pub const AGENTS_SETTING_KEY: &str = "trainingAgents";
/// Keychain namespace; the key is `<agentId>:token`.
pub const AGENT_SECRET_NAMESPACE: &str = "training-agent";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrainingAgent {
    pub id: String,
    pub name: String,
    pub url: String,
}

/// Turns an agent id into a ready client. A trait so tests can point a run at
/// an in-process agent without the keychain or the settings table.
pub trait AgentResolver: Send + Sync {
    fn client_for(&self, agent_id: &str) -> Result<AgentClient, AppError>;
}

/// Resolves agents from the settings table + the OS keychain.
pub struct SettingsAgentResolver {
    settings: Arc<dyn SettingRepository>,
}

impl SettingsAgentResolver {
    pub fn new(settings: Arc<dyn SettingRepository>) -> Self {
        Self { settings }
    }

    pub fn list(&self) -> Result<Vec<TrainingAgent>, AppError> {
        let Some(setting) = self.settings.get_by_key(AGENTS_SETTING_KEY)? else {
            return Ok(Vec::new());
        };
        if setting.value.trim().is_empty() {
            return Ok(Vec::new());
        }
        Ok(serde_json::from_str(&setting.value)?)
    }
}

impl AgentResolver for SettingsAgentResolver {
    fn client_for(&self, agent_id: &str) -> Result<AgentClient, AppError> {
        let agent = self
            .list()?
            .into_iter()
            .find(|agent| agent.id == agent_id)
            .ok_or_else(|| {
                AppError::Message(
                    "This training agent is no longer registered. Pick another in the \
                     training dialog, or add it again in Settings."
                        .into(),
                )
            })?;
        let token = crate::read_secret(AGENT_SECRET_NAMESPACE, &format!("{agent_id}:token"))?
            .ok_or_else(|| {
                AppError::Message(format!(
                    "No access token is stored for agent “{}”. Edit it in Settings and \
                     enter the token again.",
                    agent.name
                ))
            })?;
        client(&agent.url, &token)
    }
}

pub fn client(url: &str, token: &str) -> Result<AgentClient, AppError> {
    AgentClient::new(url, token).map_err(|error| AppError::Message(error.to_string()))
}

// ── Run metadata ─────────────────────────────────────────────────────────────

/// Key inside a run's `config` holding Studio's own bookkeeping. Every other
/// key is a trainer option and is forwarded to the trainer verbatim — so
/// anything Studio-specific must live under this key, which is stripped first.
pub const META_KEY: &str = "_studio";

/// Studio's bookkeeping for one training run, stored at `config._studio`.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct RunMeta {
    /// The agent the run trains on; `None` = this computer.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,
    /// `"last"` = fine-tune from the project's most recent trained weights.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub continue_from: Option<String>,
    /// The run whose weights this run started from (resolved at start).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_run_id: Option<String>,
    /// Trainer family ("yolo" / "rtdetr"), kept so a later run knows whether
    /// it can fine-tune from this one.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_family: Option<String>,
    /// Labeled items in the dataset this run trained on — the baseline
    /// automatic retraining measures "new labels" against.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub labeled_items: Option<u64>,
    /// True when automatic retraining started the run.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub auto: bool,
}

impl RunMeta {
    pub fn of(config: &Value) -> Self {
        config
            .get(META_KEY)
            .cloned()
            .and_then(|meta| serde_json::from_value(meta).ok())
            .unwrap_or_default()
    }

    /// `config` with this metadata written back under [`META_KEY`].
    pub fn write_into(&self, config: Value) -> Value {
        let mut map = match config {
            Value::Object(map) => map,
            _ => serde_json::Map::new(),
        };
        map.insert(
            META_KEY.into(),
            serde_json::to_value(self).unwrap_or(Value::Null),
        );
        Value::Object(map)
    }
}

/// The options to hand the trainer: `config` minus Studio's bookkeeping.
pub fn trainer_config(config: &Value) -> Value {
    match config {
        Value::Object(map) => Value::Object(
            map.iter()
                .filter(|(key, _)| !key.starts_with('_'))
                .map(|(key, value)| (key.clone(), value.clone()))
                .collect(),
        ),
        _ => Value::Object(serde_json::Map::new()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn reads_metadata_and_tolerates_its_absence() {
        let meta =
            RunMeta::of(&json!({ "epochs": 5, "_studio": { "agentId": "a1", "auto": true } }));

        assert_eq!(meta.agent_id.as_deref(), Some("a1"));
        assert!(meta.auto);
        assert_eq!(RunMeta::of(&json!({ "epochs": 5 })), RunMeta::default());
        assert_eq!(RunMeta::of(&Value::Null), RunMeta::default());
    }

    #[test]
    fn strips_bookkeeping_before_the_config_reaches_the_trainer() {
        let config = json!({ "epochs": 5, "imgsz": 640, "_studio": { "agentId": "a1" } });

        assert_eq!(
            trainer_config(&config),
            json!({ "epochs": 5, "imgsz": 640 })
        );
        assert_eq!(trainer_config(&Value::Null), json!({}));
    }

    #[test]
    fn writes_metadata_back_without_touching_trainer_options() {
        let meta = RunMeta {
            agent_id: Some("a1".into()),
            labeled_items: Some(42),
            ..RunMeta::default()
        };

        let config = meta.write_into(json!({ "epochs": 5 }));

        assert_eq!(
            config,
            json!({ "epochs": 5, "_studio": { "agentId": "a1", "labeledItems": 42 } })
        );
        assert_eq!(RunMeta::of(&config), meta);
    }
}
