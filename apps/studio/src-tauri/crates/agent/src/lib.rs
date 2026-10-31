//! The Vailabel training agent: a small service installed on a training machine
//! (typically a GPU server) that Studio sends training jobs to.
//!
//! Studio uploads a dataset, the agent queues the job and trains it with the
//! same Python runtime the desktop app embeds, and Studio downloads the
//! resulting weights. See `crates/agent/README.md` for installation.

pub mod config;
pub mod jobs;
pub mod python;
pub mod server;
pub mod service;
pub mod trainer;

use std::sync::Arc;
use std::time::Duration;

use runtime_manager::{RuntimeConfiguration, RuntimeService};

use crate::config::AgentConfig;
use crate::jobs::Engine;
use crate::server::AppState;
use crate::trainer::{RuntimeTrainer, Trainer};

/// How often the scheduler syncs with the trainer and starts queued jobs.
const TICK: Duration = Duration::from_secs(2);

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let terminate = async {
        use tokio::signal::unix::{signal, SignalKind};
        match signal(SignalKind::terminate()) {
            Ok(mut stream) => {
                stream.recv().await;
            }
            Err(_) => std::future::pending::<()>().await,
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {}
        _ = terminate => {}
    }
}

/// Serve the agent API on `listener` until `shutdown` resolves.
pub async fn serve(
    listener: tokio::net::TcpListener,
    state: AppState,
    shutdown: impl std::future::Future<Output = ()> + Send + 'static,
) -> std::io::Result<()> {
    axum::serve(listener, server::router(state))
        .with_graceful_shutdown(shutdown)
        .await
}

/// Run the agent until it is asked to stop (Ctrl-C / SIGTERM).
pub async fn run(config: AgentConfig) -> Result<(), String> {
    if config.token.trim().is_empty() {
        return Err("The config has no token. Run `vailabel-agent init --force`.".into());
    }
    std::fs::create_dir_all(&config.data_dir)
        .map_err(|e| format!("Could not create {}: {e}", config.data_dir.display()))?;
    let app_entry = python::install_runtime(&config.runtime_dir())
        .map_err(|e| format!("Could not install the runtime files: {e}"))?;

    // The Python runtime listens on loopback only, behind its own random token;
    // the agent's HTTP API is the only thing exposed to the network.
    let runtime = Arc::new(RuntimeService::new(RuntimeConfiguration::new(
        config.python.clone(),
        app_entry,
        config.data_dir.join("models"),
        config.data_dir.join("logs"),
        config::new_token(),
    )));
    let trainer: Arc<dyn Trainer> = Arc::new(RuntimeTrainer::new(runtime));
    let engine = Arc::new(
        Engine::open(config.jobs_dir(), trainer.clone(), config.max_concurrent)
            .map_err(|e| e.to_string())?,
    );

    let scheduler = {
        let engine = engine.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(TICK);
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
            loop {
                interval.tick().await;
                engine.tick().await;
            }
        })
    };

    let listener = tokio::net::TcpListener::bind(&config.bind)
        .await
        .map_err(|e| format!("Could not listen on {}: {e}", config.bind))?;
    println!(
        "[agent] {} listening on http://{} (data: {})",
        config.name,
        config.bind,
        config.data_dir.display()
    );

    let state = AppState {
        engine,
        trainer: trainer.clone(),
        config: Arc::new(config),
    };
    let served = serve(listener, state, shutdown_signal())
        .await
        .map_err(|e| e.to_string());

    println!("[agent] shutting down");
    scheduler.abort();
    trainer.shutdown().await;
    served
}
