use std::time::{Duration, Instant};

use crate::client::RuntimeClient;
use crate::error::{Result, RuntimeError};
use crate::types::HealthResponse;

fn is_healthy(h: &HealthResponse) -> bool {
    matches!(h.status.as_str(), "ok" | "healthy" | "up")
}

/// Poll `GET /health` every 250ms until the runtime reports healthy or the
/// deadline passes. Resolves `start()` only on the first healthy response.
pub async fn wait_until_healthy(
    client: &RuntimeClient,
    deadline: Instant,
    probe_timeout: Duration,
) -> Result<HealthResponse> {
    loop {
        if Instant::now() >= deadline {
            return Err(RuntimeError::StartTimeout);
        }
        if let Ok(h) = client.health(probe_timeout).await {
            if is_healthy(&h) {
                return Ok(h);
            }
        }
        tokio::time::sleep(Duration::from_millis(250)).await;
    }
}
