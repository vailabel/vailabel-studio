use std::path::PathBuf;
use std::time::Duration;

/// Everything the launcher/monitor need, resolved by the Tauri glue and passed
/// in as plain values so this crate stays Tauri-free.
#[derive(Debug, Clone)]
pub struct RuntimeConfiguration {
    /// Path to the bundled interpreter (`resources/python/python.exe` on Windows).
    pub python_exe: PathBuf,
    /// FastAPI entry point (`resources/runtime/app.py`).
    pub app_entry: PathBuf,
    /// `PYTHONHOME` for the hermetic interpreter (usually `resources/python`).
    pub python_home: Option<PathBuf>,
    /// Extra `PYTHONPATH` entries (e.g. an on-demand CUDA wheel dir).
    pub extra_pythonpath: Vec<PathBuf>,
    /// Dirs prepended to `PATH` (e.g. CUDA DLLs), mirrors the ORT installer.
    pub extra_path: Vec<PathBuf>,
    /// Where weights live; handed to the runtime as `--models-dir`.
    pub models_dir: PathBuf,
    /// Rolling runtime logs.
    pub log_dir: PathBuf,
    /// Shared bearer token; the runtime rejects requests without it.
    pub token: String,
    /// Bind host; always loopback.
    pub host: String,

    pub health_interval: Duration,
    pub health_timeout: Duration,
    pub startup_timeout: Duration,
    pub shutdown_timeout: Duration,
    /// Consecutive failed probes (while alive) before flagging `Unhealthy`.
    pub unhealthy_threshold: u32,
    /// Max auto-restart attempts after a crash before giving up.
    pub max_retries: u32,
    pub backoff_base: Duration,
    pub backoff_max: Duration,
}

impl RuntimeConfiguration {
    pub fn new(
        python_exe: PathBuf,
        app_entry: PathBuf,
        models_dir: PathBuf,
        log_dir: PathBuf,
        token: String,
    ) -> Self {
        Self {
            python_exe,
            app_entry,
            python_home: None,
            extra_pythonpath: Vec::new(),
            extra_path: Vec::new(),
            models_dir,
            log_dir,
            token,
            host: "127.0.0.1".to_string(),
            health_interval: Duration::from_secs(10),
            health_timeout: Duration::from_secs(2),
            startup_timeout: Duration::from_secs(60),
            shutdown_timeout: Duration::from_secs(8),
            unhealthy_threshold: 3,
            max_retries: 5,
            backoff_base: Duration::from_secs(1),
            backoff_max: Duration::from_secs(16),
        }
    }
}
