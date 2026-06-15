//! The 10s health/metrics loop + crash recovery. Implemented as additional
//! methods on [`RuntimeService`] (same-crate inherent impl split for clarity).

use std::time::Duration;

use crate::metrics::MetricsSampler;
use crate::service::RuntimeService;
use crate::types::{RuntimeEvent, RuntimeState};

impl RuntimeService {
    /// Run the monitor forever. The `emit` callback is wired by the Tauri glue
    /// to `app.emit(event.channel(), event.payload())`.
    pub async fn run_monitor<F>(&self, emit: F)
    where
        F: Fn(RuntimeEvent) + Send + Sync + 'static,
    {
        let mut sampler = MetricsSampler::new();
        let mut last_state: Option<RuntimeState> = None;
        let mut consecutive_unhealthy = 0u32;

        loop {
            tokio::time::sleep(self.config.health_interval).await;

            // Snapshot the process state under a brief lock.
            let (running, port, pid, manual_stop) = {
                let inner = self.inner.lock().await;
                match inner.proc.as_ref() {
                    Some(rp) => (true, Some(rp.port), rp.pid, inner.manual_stop),
                    None => (false, None, None, inner.manual_stop),
                }
            };

            if !running {
                self.emit_status_if_changed(&emit, &mut last_state, false, false);
                continue;
            }
            let port = match port {
                Some(p) => p,
                None => continue,
            };

            // Did the process exit since the last tick?
            let exited = {
                let mut inner = self.inner.lock().await;
                match inner.proc.as_mut() {
                    Some(rp) => matches!(rp.child.try_wait(), Ok(Some(_))),
                    None => false,
                }
            };
            if exited {
                if manual_stop {
                    continue;
                }
                self.set_state(RuntimeState::Crashed);
                self.handle_crash(&emit).await;
                last_state = Some(self.state());
                continue;
            }

            // Health probe (no lock held).
            let client = match self.make_client(port) {
                Ok(c) => c,
                Err(_) => continue,
            };
            match client.health(self.config.health_timeout).await {
                Ok(h) => {
                    consecutive_unhealthy = 0;
                    self.update_snapshot(|s| {
                        s.version = Some(h.version.clone());
                        s.uptime_s = Some(h.uptime_s);
                    });
                    if self.state() != RuntimeState::Healthy {
                        self.set_state(RuntimeState::Healthy);
                    }
                    if let Some(pid) = pid {
                        let m = sampler.sample(pid);
                        self.update_snapshot(|s| s.metrics = Some(m.clone()));
                        emit(RuntimeEvent::Metrics(m));
                    }
                }
                Err(_) => {
                    consecutive_unhealthy += 1;
                    if consecutive_unhealthy >= self.config.unhealthy_threshold {
                        self.set_state(RuntimeState::Unhealthy);
                    }
                }
            }

            self.emit_status_if_changed(&emit, &mut last_state, false, false);
        }
    }

    fn emit_status_if_changed<F>(
        &self,
        emit: &F,
        last_state: &mut Option<RuntimeState>,
        restarted_from_crash: bool,
        give_up: bool,
    ) where
        F: Fn(RuntimeEvent),
    {
        let st = self.state();
        if *last_state != Some(st) {
            emit(RuntimeEvent::Status(
                self.status_event(restarted_from_crash, give_up),
            ));
            *last_state = Some(st);
        }
    }

    /// Auto-restart with exponential backoff, capped at `max_retries`.
    pub(crate) async fn handle_crash<F>(&self, emit: &F)
    where
        F: Fn(RuntimeEvent),
    {
        self.set_state(RuntimeState::Restarting);
        emit(RuntimeEvent::Status(self.status_event(false, false)));

        let max = self.config.max_retries;
        let mut attempt = 0u32;
        loop {
            attempt += 1;
            self.update_snapshot(|s| s.restart_count += 1);
            tokio::time::sleep(self.backoff_for(attempt)).await;

            let mut inner = self.inner.lock().await;
            if inner.manual_stop {
                return;
            }
            inner.proc = None;
            match self.spawn_locked(&mut inner).await {
                Ok(_) => {
                    drop(inner);
                    emit(RuntimeEvent::Status(self.status_event(true, false)));
                    return;
                }
                Err(e) => {
                    self.update_snapshot(|s| s.last_error = Some(e.to_string()));
                    if attempt >= max {
                        self.set_state(RuntimeState::Crashed);
                        drop(inner);
                        emit(RuntimeEvent::Status(self.status_event(false, true)));
                        return;
                    }
                }
            }
        }
    }

    pub(crate) fn backoff_for(&self, attempt: u32) -> Duration {
        let base = self.config.backoff_base.as_secs_f64();
        let max = self.config.backoff_max.as_secs_f64();
        let exp = base * 2f64.powi(attempt.saturating_sub(1) as i32);
        Duration::from_secs_f64(exp.min(max))
    }
}

#[cfg(test)]
mod tests {
    use crate::config::RuntimeConfiguration;
    use crate::launcher;
    use crate::service::RuntimeService;
    use crate::types::{HealthResponse, RuntimeState};
    use std::path::PathBuf;
    use std::time::Duration;

    fn svc() -> RuntimeService {
        let cfg = RuntimeConfiguration::new(
            PathBuf::from("python"),
            PathBuf::from("app.py"),
            PathBuf::from("models"),
            PathBuf::from("logs"),
            "test-token".into(),
        );
        RuntimeService::new(cfg)
    }

    #[test]
    fn free_port_is_nonzero() {
        let p = launcher::free_port().unwrap();
        assert!(p > 0);
    }

    #[test]
    fn backoff_is_capped_and_monotonic() {
        let s = svc();
        let b1 = s.backoff_for(1);
        let b2 = s.backoff_for(2);
        let b3 = s.backoff_for(3);
        assert!(b1 <= b2 && b2 <= b3);
        assert!(s.backoff_for(20) <= Duration::from_secs(16));
    }

    #[test]
    fn starts_stopped() {
        assert_eq!(svc().state(), RuntimeState::Stopped);
    }

    #[test]
    fn health_response_round_trips() {
        let json = r#"{"status":"ok","version":"1.2.3","uptime_s":4.5,"gpu_available":true,"loaded_models":["yolo"]}"#;
        let h: HealthResponse = serde_json::from_str(json).unwrap();
        assert_eq!(h.status, "ok");
        assert_eq!(h.version, "1.2.3");
        assert!(h.gpu_available);
        assert_eq!(h.loaded_models, vec!["yolo".to_string()]);
    }

    #[test]
    fn runtime_state_serializes_lowercase() {
        let v = serde_json::to_string(&RuntimeState::Healthy).unwrap();
        assert_eq!(v, "\"healthy\"");
    }
}
