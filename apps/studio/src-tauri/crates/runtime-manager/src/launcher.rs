use std::path::PathBuf;
use std::process::Stdio;

use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};

use crate::config::RuntimeConfiguration;
use crate::error::{Result, RuntimeError};
use crate::platform::{self, ProcessGuard};

/// Maximum size a rolling log file reaches before being rotated to `.old`.
const LOG_ROTATE_BYTES: u64 = 5 * 1024 * 1024;

/// A spawned runtime process plus its platform teardown guard.
pub struct RunningProcess {
    pub child: Child,
    pub port: u16,
    pub pid: Option<u32>,
    pub guard: ProcessGuard,
}

/// Ask the OS for a free loopback port (bind :0, read it, release).
pub fn free_port() -> Result<u16> {
    let listener = std::net::TcpListener::bind("127.0.0.1:0")
        .map_err(|e| RuntimeError::PortAllocation(e.to_string()))?;
    let port = listener
        .local_addr()
        .map_err(|e| RuntimeError::PortAllocation(e.to_string()))?
        .port();
    drop(listener);
    Ok(port)
}

fn join_paths(paths: &[PathBuf]) -> Option<std::ffi::OsString> {
    if paths.is_empty() {
        return None;
    }
    std::env::join_paths(paths.iter()).ok()
}

/// Spawn the bundled interpreter running the FastAPI entry point on `port`.
pub fn spawn(config: &RuntimeConfiguration, port: u16) -> Result<RunningProcess> {
    if !config.python_exe.exists() {
        return Err(RuntimeError::ExecutableNotFound(
            config.python_exe.display().to_string(),
        ));
    }
    std::fs::create_dir_all(&config.log_dir).ok();
    std::fs::create_dir_all(&config.models_dir).ok();

    let mut cmd = Command::new(&config.python_exe);
    cmd.arg(&config.app_entry)
        .arg("--host")
        .arg(&config.host)
        .arg("--port")
        .arg(port.to_string())
        .arg("--token")
        .arg(&config.token)
        .arg("--models-dir")
        .arg(&config.models_dir)
        .arg("--log-dir")
        .arg(&config.log_dir);

    if let Some(home) = &config.python_home {
        cmd.env("PYTHONHOME", home);
    }
    if let Some(pythonpath) = join_paths(&config.extra_pythonpath) {
        cmd.env("PYTHONPATH", pythonpath);
    }
    if !config.extra_path.is_empty() {
        let mut entries = config.extra_path.clone();
        if let Some(existing) = std::env::var_os("PATH") {
            entries.extend(std::env::split_paths(&existing));
        }
        if let Ok(joined) = std::env::join_paths(entries) {
            cmd.env("PATH", joined);
        }
    }
    cmd.env("VAILABEL_RUNTIME_TOKEN", &config.token);

    cmd.stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    platform::configure_command(&mut cmd);

    let mut child = cmd
        .spawn()
        .map_err(|e| RuntimeError::Spawn(e.to_string()))?;
    let pid = child.id();
    let guard = platform::assign_to_guard(&child)?;

    let log_path = config.log_dir.join("runtime.log");
    if let Some(out) = child.stdout.take() {
        spawn_log_reader(out, log_path.clone(), "out");
    }
    if let Some(err) = child.stderr.take() {
        spawn_log_reader(err, log_path, "err");
    }

    Ok(RunningProcess {
        child,
        port,
        pid,
        guard,
    })
}

/// Append each line from a child stream into the rolling runtime log.
fn spawn_log_reader<R>(stream: R, path: PathBuf, tag: &'static str)
where
    R: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    tokio::spawn(async move {
        let mut lines = BufReader::new(stream).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            rotate_if_needed(&path).await;
            if let Ok(mut f) = tokio::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&path)
                .await
            {
                let _ = f
                    .write_all(format!("[{tag}] {line}\n").as_bytes())
                    .await;
            }
        }
    });
}

async fn rotate_if_needed(path: &PathBuf) {
    if let Ok(meta) = tokio::fs::metadata(path).await {
        if meta.len() > LOG_ROTATE_BYTES {
            let old = path.with_extension("old.log");
            let _ = tokio::fs::rename(path, old).await;
        }
    }
}
