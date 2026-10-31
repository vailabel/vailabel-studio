//! Running the agent as a systemd service.

use std::path::{Path, PathBuf};
use std::process::Command;

pub const UNIT_NAME: &str = "vailabel-agent.service";
const UNIT_PATH: &str = "/etc/systemd/system/vailabel-agent.service";

/// The unit file. The service restarts on failure, and systemd stops the whole
/// control group — so the Python trainer never outlives the agent.
pub fn unit_file(executable: &Path, config: &Path, user: Option<&str>) -> String {
    let user_line = user
        .map(|user| format!("User={user}\n"))
        .unwrap_or_default();
    format!(
        "[Unit]\n\
         Description=Vailabel training agent\n\
         After=network-online.target\n\
         Wants=network-online.target\n\
         \n\
         [Service]\n\
         Type=simple\n\
         ExecStart={exe} run --config {config}\n\
         Restart=on-failure\n\
         RestartSec=5\n\
         {user_line}\
         KillMode=control-group\n\
         TimeoutStopSec=30\n\
         NoNewPrivileges=true\n\
         \n\
         [Install]\n\
         WantedBy=multi-user.target\n",
        exe = quote(executable),
        config = quote(config),
    )
}

/// Quote a path for an `ExecStart=` line when it needs it.
fn quote(path: &Path) -> String {
    let text = path.to_string_lossy();
    if text.contains(char::is_whitespace) {
        format!("\"{}\"", text.replace('"', "\\\""))
    } else {
        text.into_owned()
    }
}

fn systemctl(args: &[&str]) -> Result<(), String> {
    let status = Command::new("systemctl")
        .args(args)
        .status()
        .map_err(|e| format!("Could not run systemctl: {e}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("`systemctl {}` failed ({status}).", args.join(" ")))
    }
}

/// Install (and by default start) the service. Needs root.
pub fn install(config: &Path, user: Option<&str>, start: bool) -> Result<PathBuf, String> {
    if !cfg!(target_os = "linux") {
        return Err("Service install is only supported on Linux (systemd).".into());
    }
    let executable = std::env::current_exe().map_err(|e| e.to_string())?;
    let config = std::fs::canonicalize(config)
        .map_err(|e| format!("Could not find {}: {e}", config.display()))?;
    std::fs::write(UNIT_PATH, unit_file(&executable, &config, user))
        .map_err(|e| format!("Could not write {UNIT_PATH}: {e}. Run this command with sudo."))?;
    systemctl(&["daemon-reload"])?;
    if start {
        systemctl(&["enable", "--now", UNIT_NAME])?;
    }
    Ok(PathBuf::from(UNIT_PATH))
}

pub fn uninstall() -> Result<(), String> {
    if !cfg!(target_os = "linux") {
        return Err("Service uninstall is only supported on Linux (systemd).".into());
    }
    // The service may already be stopped or disabled; that is fine.
    let _ = systemctl(&["disable", "--now", UNIT_NAME]);
    match std::fs::remove_file(UNIT_PATH) {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(format!("Could not remove {UNIT_PATH}: {error}")),
    }
    systemctl(&["daemon-reload"])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_a_unit_that_runs_the_agent_with_its_config() {
        let unit = unit_file(
            Path::new("/usr/local/bin/vailabel-agent"),
            Path::new("/etc/vailabel-agent/config.json"),
            Some("trainer"),
        );

        assert!(unit.contains(
            "ExecStart=/usr/local/bin/vailabel-agent run --config /etc/vailabel-agent/config.json\n"
        ));
        assert!(unit.contains("User=trainer\n"));
        assert!(unit.contains("KillMode=control-group"));
        assert!(unit.contains("WantedBy=multi-user.target"));
    }

    #[test]
    fn quotes_paths_with_spaces_and_omits_user_when_unset() {
        let unit = unit_file(Path::new("/opt/my agent/bin"), Path::new("/c.json"), None);

        assert!(unit.contains("ExecStart=\"/opt/my agent/bin\" run --config /c.json\n"));
        assert!(!unit.contains("User="));
    }
}
