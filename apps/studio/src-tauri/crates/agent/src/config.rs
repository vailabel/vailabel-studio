//! The agent's on-disk configuration (a JSON file written by `init`).

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use vailabel_agent_client::DEFAULT_PORT;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfig {
    /// Name shown in Studio's agent list.
    pub name: String,
    /// Address to listen on, e.g. `0.0.0.0:8765`.
    pub bind: String,
    /// Shared secret Studio must present as a bearer token.
    pub token: String,
    /// Where jobs, datasets, weights and the Python runtime files live.
    pub data_dir: PathBuf,
    /// Python interpreter with the training requirements installed.
    pub python: PathBuf,
    /// Training jobs run at once; further jobs wait in a queue.
    #[serde(default = "default_max_concurrent")]
    pub max_concurrent: u32,
    /// Largest accepted upload (dataset or weights), in megabytes.
    #[serde(default = "default_max_upload_mb")]
    pub max_upload_mb: u64,
}

fn default_max_concurrent() -> u32 {
    1
}

fn default_max_upload_mb() -> u64 {
    50 * 1024
}

fn is_root() -> bool {
    #[cfg(unix)]
    {
        // SAFETY: geteuid has no preconditions and cannot fail.
        unsafe { geteuid() == 0 }
    }
    #[cfg(not(unix))]
    {
        false
    }
}

#[cfg(unix)]
extern "C" {
    fn geteuid() -> u32;
}

fn home() -> PathBuf {
    std::env::var_os("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

/// System-wide when run as root (the service install), per-user otherwise.
pub fn default_config_path() -> PathBuf {
    if is_root() {
        PathBuf::from("/etc/vailabel-agent/config.json")
    } else {
        home().join(".config/vailabel-agent/config.json")
    }
}

pub fn default_data_dir() -> PathBuf {
    if is_root() {
        PathBuf::from("/var/lib/vailabel-agent")
    } else {
        home().join(".local/share/vailabel-agent")
    }
}

/// A fresh random token: 244 bits from the OS RNG, hex-encoded.
pub fn new_token() -> String {
    format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    )
}

impl AgentConfig {
    pub fn new(name: String, data_dir: PathBuf, python: PathBuf) -> Self {
        Self {
            name,
            bind: format!("0.0.0.0:{DEFAULT_PORT}"),
            token: new_token(),
            data_dir,
            python,
            max_concurrent: default_max_concurrent(),
            max_upload_mb: default_max_upload_mb(),
        }
    }

    pub fn load(path: &Path) -> Result<Self, String> {
        let text = std::fs::read_to_string(path).map_err(|e| {
            format!(
                "Could not read {}: {e}. Run `vailabel-agent init` first.",
                path.display()
            )
        })?;
        serde_json::from_str(&text).map_err(|e| format!("{} is not valid: {e}", path.display()))
    }

    /// Write the config readable only by its owner — it holds the token.
    pub fn save(&self, path: &Path) -> Result<(), String> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let text = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(path, text)
            .map_err(|e| format!("Could not write {}: {e}", path.display()))?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600));
        }
        Ok(())
    }

    pub fn jobs_dir(&self) -> PathBuf {
        self.data_dir.join("jobs")
    }

    pub fn runtime_dir(&self) -> PathBuf {
        self.data_dir.join("runtime")
    }

    pub fn venv_dir(&self) -> PathBuf {
        self.data_dir.join("venv")
    }

    pub fn max_upload_bytes(&self) -> u64 {
        self.max_upload_mb.saturating_mul(1024 * 1024)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_and_fills_defaults() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested/config.json");
        let config = AgentConfig::new("box".into(), dir.path().into(), "python3".into());

        config.save(&path).unwrap();
        let loaded = AgentConfig::load(&path).unwrap();

        assert_eq!(loaded.token, config.token);
        assert_eq!(loaded.max_concurrent, 1);
        assert_eq!(config.token.len(), 64);
    }

    #[test]
    fn accepts_a_config_without_optional_fields() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");
        std::fs::write(
            &path,
            r#"{"name":"a","bind":"0.0.0.0:1","token":"t","dataDir":"/d","python":"py"}"#,
        )
        .unwrap();

        assert_eq!(AgentConfig::load(&path).unwrap().max_concurrent, 1);
    }

    #[test]
    fn explains_a_missing_config() {
        let error = AgentConfig::load(Path::new("/nonexistent/config.json")).unwrap_err();
        assert!(error.contains("vailabel-agent init"));
    }
}
