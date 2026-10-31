//! The client Studio uses to drive a training agent.

use std::path::Path;
use std::time::Duration;

use futures_util::StreamExt;
use reqwest::{Method, RequestBuilder, Response, StatusCode};
use serde::de::DeserializeOwned;
use tokio::io::AsyncWriteExt;
use tokio_util::io::ReaderStream;

use crate::error::{AgentError, Result};
use crate::protocol::{AgentInfo, CreateJobRequest, ErrorBody, JobView, LogChunk, API_PREFIX};

/// Timeout for small JSON calls. Uploads and downloads have no overall
/// deadline — a dataset can take minutes — only a connect timeout.
const CALL_TIMEOUT: Duration = Duration::from_secs(20);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Clone)]
pub struct AgentClient {
    base: String,
    token: String,
    http: reqwest::Client,
}

impl AgentClient {
    /// `base_url` is the agent's address as the user typed it, e.g.
    /// `http://gpu-box:8765` (a missing scheme defaults to `http://`).
    pub fn new(base_url: &str, token: &str) -> Result<Self> {
        let trimmed = base_url.trim().trim_end_matches('/');
        if trimmed.is_empty() {
            return Err(AgentError::Invalid("The agent address is empty.".into()));
        }
        let base = if trimmed.contains("://") {
            trimmed.to_string()
        } else {
            format!("http://{trimmed}")
        };
        let http = reqwest::Client::builder()
            .connect_timeout(CONNECT_TIMEOUT)
            .build()
            .map_err(|e| AgentError::Invalid(e.to_string()))?;
        Ok(Self {
            base,
            token: token.trim().to_string(),
            http,
        })
    }

    pub fn base_url(&self) -> &str {
        &self.base
    }

    fn request(&self, method: Method, path: &str) -> RequestBuilder {
        self.http
            .request(method, format!("{}{API_PREFIX}{path}", self.base))
            .bearer_auth(&self.token)
    }

    async fn send(&self, request: RequestBuilder) -> Result<Response> {
        let response = request
            .send()
            .await
            .map_err(|source| AgentError::Unreachable {
                url: self.base.clone(),
                source,
            })?;
        let status = response.status();
        if status.is_success() {
            return Ok(response);
        }
        if status == StatusCode::UNAUTHORIZED {
            return Err(AgentError::Unauthorized);
        }
        let text = response.text().await.unwrap_or_default();
        let message = serde_json::from_str::<ErrorBody>(&text)
            .map(|body| body.error)
            .unwrap_or(text);
        Err(AgentError::Api {
            status: status.as_u16(),
            message,
        })
    }

    async fn json<T: DeserializeOwned>(&self, request: RequestBuilder) -> Result<T> {
        self.send(request.timeout(CALL_TIMEOUT))
            .await?
            .json()
            .await
            .map_err(AgentError::Decode)
    }

    /// Identify the agent — also the "test connection" call.
    pub async fn info(&self) -> Result<AgentInfo> {
        self.json(self.request(Method::GET, "/agent")).await
    }

    pub async fn create_job(&self, request: &CreateJobRequest) -> Result<JobView> {
        self.json(self.request(Method::POST, "/jobs").json(request))
            .await
    }

    async fn upload(&self, path: &str, file: &Path) -> Result<JobView> {
        let handle = tokio::fs::File::open(file).await?;
        let length = handle.metadata().await?.len();
        let body = reqwest::Body::wrap_stream(ReaderStream::new(handle));
        let response = self
            .send(
                self.request(Method::PUT, path)
                    .header(reqwest::header::CONTENT_LENGTH, length)
                    .header(reqwest::header::CONTENT_TYPE, "application/octet-stream")
                    .body(body),
            )
            .await?;
        response.json().await.map_err(AgentError::Decode)
    }

    /// Upload the dataset as a tar made by [`crate::archive::pack_dir`].
    /// `entry` is the dataset file inside it the trainer should open
    /// (`data.yaml`).
    pub async fn upload_dataset(&self, job_id: &str, tar: &Path, entry: &str) -> Result<JobView> {
        let entry: String = url_encode(entry);
        self.upload(&format!("/jobs/{job_id}/dataset?entry={entry}"), tar)
            .await
    }

    /// Upload base weights to fine-tune from.
    pub async fn upload_weights(&self, job_id: &str, weights: &Path) -> Result<JobView> {
        self.upload(&format!("/jobs/{job_id}/weights"), weights)
            .await
    }

    pub async fn start_job(&self, job_id: &str) -> Result<JobView> {
        self.json(self.request(Method::POST, &format!("/jobs/{job_id}/start")))
            .await
    }

    pub async fn stop_job(&self, job_id: &str) -> Result<JobView> {
        self.json(self.request(Method::POST, &format!("/jobs/{job_id}/stop")))
            .await
    }

    pub async fn job(&self, job_id: &str) -> Result<JobView> {
        self.json(self.request(Method::GET, &format!("/jobs/{job_id}")))
            .await
    }

    pub async fn jobs(&self) -> Result<Vec<JobView>> {
        self.json(self.request(Method::GET, "/jobs")).await
    }

    pub async fn logs(&self, job_id: &str, offset: u64) -> Result<LogChunk> {
        self.json(self.request(Method::GET, &format!("/jobs/{job_id}/logs?offset={offset}")))
            .await
    }

    /// Download the job's artifacts (weights, results, plots) as a tar to `dest`.
    pub async fn download_artifacts(&self, job_id: &str, dest: &Path) -> Result<()> {
        let response = self
            .send(self.request(Method::GET, &format!("/jobs/{job_id}/artifacts")))
            .await?;
        let mut file = tokio::fs::File::create(dest).await?;
        let mut stream = response.bytes_stream();
        while let Some(chunk) = stream.next().await {
            file.write_all(&chunk.map_err(AgentError::Decode)?).await?;
        }
        file.flush().await?;
        Ok(())
    }

    /// Remove a finished job and its files from the agent.
    pub async fn delete_job(&self, job_id: &str) -> Result<()> {
        self.send(
            self.request(Method::DELETE, &format!("/jobs/{job_id}"))
                .timeout(CALL_TIMEOUT),
        )
        .await?;
        Ok(())
    }
}

/// Percent-encode a query value (unreserved characters pass through).
fn url_encode(value: &str) -> String {
    value
        .bytes()
        .map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                (byte as char).to_string()
            }
            other => format!("%{other:02X}"),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_the_address_the_user_typed() {
        assert_eq!(
            AgentClient::new("gpu-box:8765/", "t").unwrap().base_url(),
            "http://gpu-box:8765"
        );
        assert_eq!(
            AgentClient::new(" https://agent.example.com ", "t")
                .unwrap()
                .base_url(),
            "https://agent.example.com"
        );
        assert!(AgentClient::new("  ", "t").is_err());
    }

    #[test]
    fn encodes_query_values() {
        assert_eq!(url_encode("data.yaml"), "data.yaml");
        assert_eq!(url_encode("my data/x.yaml"), "my%20data%2Fx.yaml");
    }
}
