use std::sync::Mutex as StdMutex;
use std::time::Instant;

use tokio::sync::Mutex as AsyncMutex;

use crate::client::RuntimeClient;
use crate::config::RuntimeConfiguration;
use crate::error::Result;
use crate::health;
use crate::launcher::{self, RunningProcess};
use crate::types::{RuntimeMetrics, RuntimeState, RuntimeStatus, StatusEvent};

/// Mutable process control, guarded by an async mutex so it can be held across
/// spawn/kill awaits.
pub(crate) struct Inner {
    pub(crate) proc: Option<RunningProcess>,
    /// True when the user explicitly stopped the runtime — suppresses
    /// auto-restart.
    pub(crate) manual_stop: bool,
}

/// Lightweight, lock-cheap snapshot read by `status()` without touching the
/// process-control mutex.
#[derive(Clone, Default)]
pub(crate) struct StatusSnapshot {
    pub(crate) state: RuntimeState,
    pub(crate) port: Option<u16>,
    pub(crate) pid: Option<u32>,
    pub(crate) version: Option<String>,
    pub(crate) uptime_s: Option<f64>,
    pub(crate) last_error: Option<String>,
    pub(crate) restart_count: u32,
    pub(crate) metrics: Option<RuntimeMetrics>,
}

pub struct RuntimeService {
    pub(crate) config: RuntimeConfiguration,
    pub(crate) inner: AsyncMutex<Inner>,
    pub(crate) snapshot: StdMutex<StatusSnapshot>,
}

impl RuntimeService {
    pub fn new(config: RuntimeConfiguration) -> Self {
        Self {
            config,
            inner: AsyncMutex::new(Inner {
                proc: None,
                manual_stop: true,
            }),
            snapshot: StdMutex::new(StatusSnapshot::default()),
        }
    }

    pub fn config(&self) -> &RuntimeConfiguration {
        &self.config
    }

    // -- snapshot helpers ----------------------------------------------------

    pub(crate) fn set_state(&self, state: RuntimeState) {
        self.snapshot.lock().unwrap().state = state;
    }

    pub(crate) fn update_snapshot<F: FnOnce(&mut StatusSnapshot)>(&self, f: F) {
        f(&mut self.snapshot.lock().unwrap());
    }

    pub fn state(&self) -> RuntimeState {
        self.snapshot.lock().unwrap().state
    }

    pub fn status(&self) -> RuntimeStatus {
        let s = self.snapshot.lock().unwrap();
        RuntimeStatus {
            state: s.state,
            port: s.port,
            pid: s.pid,
            version: s.version.clone(),
            uptime_s: s.uptime_s,
            last_error: s.last_error.clone(),
            restart_count: s.restart_count,
            metrics: s.metrics.clone(),
        }
    }

    pub(crate) fn status_event(&self, restarted_from_crash: bool, give_up: bool) -> StatusEvent {
        let s = self.snapshot.lock().unwrap();
        StatusEvent {
            state: s.state,
            last_error: s.last_error.clone(),
            restarted_from_crash,
            give_up,
            port: s.port,
            pid: s.pid,
        }
    }

    pub(crate) fn make_client(&self, port: u16) -> Result<RuntimeClient> {
        RuntimeClient::new(&self.config.host, port, &self.config.token)
    }

    /// A client for the running runtime, or `None` if it isn't healthy. Used by
    /// commands that should act only when the runtime is up (status, log tail).
    pub fn try_client(&self) -> Option<RuntimeClient> {
        let port = {
            let s = self.snapshot.lock().unwrap();
            if s.state == RuntimeState::Healthy {
                s.port
            } else {
                None
            }
        };
        port.and_then(|p| self.make_client(p).ok())
    }

    // -- lifecycle -----------------------------------------------------------

    /// Start the runtime (idempotent) and return a ready client. Awaits the
    /// first healthy `/health` before resolving.
    pub async fn start(&self) -> Result<RuntimeClient> {
        let mut inner = self.inner.lock().await;
        inner.manual_stop = false;

        if let Some(rp) = inner.proc.as_mut() {
            if matches!(rp.child.try_wait(), Ok(None)) {
                let port = rp.port;
                return self.make_client(port);
            }
            inner.proc = None;
        }
        self.spawn_locked(&mut inner).await
    }

    /// Spawn + wait-for-health while holding the control lock. Stores the
    /// process on success; tears it down on failure.
    pub(crate) async fn spawn_locked(&self, inner: &mut Inner) -> Result<RuntimeClient> {
        self.set_state(RuntimeState::Starting);
        let port = launcher::free_port()?;
        let rp = launcher::spawn(&self.config, port)?;
        let pid = rp.pid;
        self.update_snapshot(|s| {
            s.port = Some(port);
            s.pid = pid;
            s.last_error = None;
        });

        let client = self.make_client(port)?;
        let deadline = Instant::now() + self.config.startup_timeout;
        match health::wait_until_healthy(&client, deadline, self.config.health_timeout).await {
            Ok(h) => {
                self.update_snapshot(|s| {
                    s.version = Some(h.version.clone());
                    s.uptime_s = Some(h.uptime_s);
                });
                self.set_state(RuntimeState::Healthy);
                inner.proc = Some(rp);
                Ok(client)
            }
            Err(e) => {
                let mut rp = rp;
                let _ = rp.child.kill().await;
                rp.guard.kill_tree();
                self.update_snapshot(|s| s.last_error = Some(e.to_string()));
                self.set_state(RuntimeState::Crashed);
                Err(e)
            }
        }
    }

    /// Graceful stop: `POST /shutdown`, wait, then force-kill the tree.
    pub async fn stop(&self) -> Result<()> {
        let mut inner = self.inner.lock().await;
        inner.manual_stop = true;
        if let Some(mut rp) = inner.proc.take() {
            let port = rp.port;
            if let Ok(client) = self.make_client(port) {
                let _ = client.shutdown().await;
            }
            let waited =
                tokio::time::timeout(self.config.shutdown_timeout, rp.child.wait()).await;
            if waited.is_err() {
                let _ = rp.child.kill().await;
            }
            rp.guard.kill_tree();
            // `rp` (and its guard) drop here → Windows Job Object closes.
        }
        self.update_snapshot(|s| {
            s.state = RuntimeState::Stopped;
            s.pid = None;
            s.port = None;
            s.metrics = None;
            s.uptime_s = None;
        });
        Ok(())
    }

    pub async fn restart(&self) -> Result<RuntimeClient> {
        self.stop().await?;
        self.start().await
    }

    /// Lazily start the runtime if needed, returning a client. Used by
    /// inference/training/export commands so the heavyweight process only spins
    /// up on first use.
    pub async fn ensure_started(&self) -> Result<RuntimeClient> {
        if self.state() == RuntimeState::Healthy {
            let port = self.snapshot.lock().unwrap().port;
            if let Some(port) = port {
                return self.make_client(port);
            }
        }
        self.start().await
    }
}
