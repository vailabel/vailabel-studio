use std::time::Duration;

use serde::de::DeserializeOwned;
use serde::Serialize;

use crate::error::{Result, RuntimeError};
use crate::types::*;

/// Typed async client for the FastAPI runtime. The only thing in the app that
/// talks to the Python process.
#[derive(Clone)]
pub struct RuntimeClient {
    base: String,
    http: reqwest::Client,
}

impl RuntimeClient {
    pub fn new(host: &str, port: u16, token: &str) -> Result<Self> {
        let mut headers = reqwest::header::HeaderMap::new();
        let auth = format!("Bearer {token}");
        let value = reqwest::header::HeaderValue::from_str(&auth)
            .map_err(|e| RuntimeError::Other(format!("bad token header: {e}")))?;
        headers.insert(reqwest::header::AUTHORIZATION, value);
        let http = reqwest::Client::builder()
            .default_headers(headers)
            .build()?;
        Ok(Self {
            base: format!("http://{host}:{port}"),
            http,
        })
    }

    // -- low-level helpers ---------------------------------------------------

    async fn get_to<T: DeserializeOwned>(&self, path: &str, timeout: Duration) -> Result<T> {
        let url = format!("{}{}", self.base, path);
        let resp = self.http.get(url).timeout(timeout).send().await?;
        Self::parse(resp).await
    }

    async fn post_to<B: Serialize, T: DeserializeOwned>(
        &self,
        path: &str,
        body: &B,
        timeout: Duration,
    ) -> Result<T> {
        let url = format!("{}{}", self.base, path);
        let resp = self.http.post(url).timeout(timeout).json(body).send().await?;
        Self::parse(resp).await
    }

    async fn parse<T: DeserializeOwned>(resp: reqwest::Response) -> Result<T> {
        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(RuntimeError::Status {
                status: status.as_u16(),
                body,
            });
        }
        Ok(resp.json::<T>().await?)
    }

    // -- health / system -----------------------------------------------------

    pub async fn health(&self, timeout: Duration) -> Result<HealthResponse> {
        self.get_to("/health", timeout).await
    }

    pub async fn system_info(&self) -> Result<SystemInfoResponse> {
        self.get_to("/system", Duration::from_secs(10)).await
    }

    pub async fn gpu_info(&self) -> Result<GpuInfoResponse> {
        self.get_to("/gpu", Duration::from_secs(10)).await
    }

    /// Best-effort graceful shutdown; never errors (process may already be gone).
    pub async fn shutdown(&self) -> Result<()> {
        let url = format!("{}/shutdown", self.base);
        let _ = self
            .http
            .post(url)
            .timeout(Duration::from_secs(3))
            .send()
            .await;
        Ok(())
    }

    // -- inference -----------------------------------------------------------

    pub async fn detect(&self, req: &DetectRequest) -> Result<DetectResponse> {
        self.post_to("/inference/object-detection", req, Duration::from_secs(300))
            .await
    }

    pub async fn segment(&self, req: &SegmentRequest) -> Result<SegmentResponse> {
        self.post_to("/inference/segmentation", req, Duration::from_secs(300))
            .await
    }

    pub async fn caption(&self, req: &CaptionRequest) -> Result<CaptionResponse> {
        self.post_to("/inference/caption", req, Duration::from_secs(300))
            .await
    }

    pub async fn ocr(&self, req: &OcrRequest) -> Result<OcrResponse> {
        self.post_to("/ocr", req, Duration::from_secs(300)).await
    }

    // -- copilot -------------------------------------------------------------

    /// One copilot chat turn. The request carries the payload + read-context +
    /// LLM settings; the response carries the reply, capability, prediction
    /// drafts, findings, and proposed actions (the Rust bridge persists the
    /// drafts). Both sides are opaque JSON — the copilot core lives in Python.
    pub async fn copilot_turn(
        &self,
        req: &serde_json::Value,
    ) -> Result<serde_json::Value> {
        self.post_to("/copilot/turn", req, Duration::from_secs(300))
            .await
    }

    /// Probe a local LLM server (Settings → AI Copilot) via the Python copilot.
    pub async fn copilot_test_connection(
        &self,
        req: &serde_json::Value,
    ) -> Result<serde_json::Value> {
        self.post_to("/copilot/test-connection", req, Duration::from_secs(20))
            .await
    }

    // -- training ------------------------------------------------------------

    pub async fn training_start(&self, req: &TrainingStartRequest) -> Result<TrainingJobRef> {
        self.post_to("/training/start", req, Duration::from_secs(30))
            .await
    }

    pub async fn training_stop(&self, req: &JobIdRequest) -> Result<Ack> {
        self.post_to("/training/stop", req, Duration::from_secs(30))
            .await
    }

    pub async fn training_jobs(&self) -> Result<Vec<TrainingJobStatus>> {
        self.get_to("/training/jobs", Duration::from_secs(15)).await
    }

    pub async fn training_logs(&self, job_id: &str, offset: u64) -> Result<TrainingLogChunk> {
        let path = format!("/training/logs?job_id={job_id}&offset={offset}");
        self.get_to(&path, Duration::from_secs(15)).await
    }

    // -- export --------------------------------------------------------------

    pub async fn export_onnx(&self, req: &ExportRequest) -> Result<ExportResult> {
        self.post_to("/export/onnx", req, Duration::from_secs(600))
            .await
    }

    pub async fn export_tensorrt(&self, req: &ExportRequest) -> Result<ExportResult> {
        self.post_to("/export/tensorrt", req, Duration::from_secs(1800))
            .await
    }

    pub async fn export_openvino(&self, req: &ExportRequest) -> Result<ExportResult> {
        self.post_to("/export/openvino", req, Duration::from_secs(600))
            .await
    }
}
