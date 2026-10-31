//! The agent's HTTP API. Every route under `/v1` requires the bearer token;
//! `/healthz` is open so a supervisor can probe liveness without the secret.

use std::path::Path;
use std::sync::Arc;

use axum::body::Body;
use axum::extract::{DefaultBodyLimit, Path as UrlPath, Query, Request, State};
use axum::http::{header, StatusCode};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post, put};
use axum::{Json, Router};
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::json;
use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt};
use tokio_util::io::ReaderStream;
use vailabel_agent_client::{
    archive, status, AgentInfo, CreateJobRequest, ErrorBody, JobView, LogChunk, API_PREFIX,
};

use crate::config::AgentConfig;
use crate::jobs::{rebase_dataset_yaml, Engine, EngineError, ARTIFACT_FILES};
use crate::trainer::Trainer;

/// Most log bytes returned by one poll; the client asks again from `next_offset`.
const LOG_CHUNK_BYTES: u64 = 256 * 1024;

#[derive(Clone)]
pub struct AppState {
    pub engine: Arc<Engine>,
    pub trainer: Arc<dyn Trainer>,
    pub config: Arc<AgentConfig>,
}

struct ApiError(StatusCode, String);

impl ApiError {
    fn bad_request(message: impl Into<String>) -> Self {
        Self(StatusCode::BAD_REQUEST, message.into())
    }
    fn internal(error: impl std::fmt::Display) -> Self {
        Self(StatusCode::INTERNAL_SERVER_ERROR, error.to_string())
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(ErrorBody { error: self.1 })).into_response()
    }
}

impl From<EngineError> for ApiError {
    fn from(error: EngineError) -> Self {
        let status = match &error {
            EngineError::NotFound(_) => StatusCode::NOT_FOUND,
            EngineError::Conflict(_) => StatusCode::CONFLICT,
            EngineError::Invalid(_) => StatusCode::BAD_REQUEST,
            EngineError::Io(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };
        Self(status, error.to_string())
    }
}

impl From<std::io::Error> for ApiError {
    fn from(error: std::io::Error) -> Self {
        Self::internal(error)
    }
}

type ApiResult<T> = Result<T, ApiError>;

pub fn router(state: AppState) -> Router {
    let api = Router::new()
        .route("/agent", get(agent_info))
        .route("/jobs", get(list_jobs).post(create_job))
        .route("/jobs/{id}", get(get_job).delete(delete_job))
        .route("/jobs/{id}/dataset", put(upload_dataset))
        .route("/jobs/{id}/weights", put(upload_weights))
        .route("/jobs/{id}/start", post(start_job))
        .route("/jobs/{id}/stop", post(stop_job))
        .route("/jobs/{id}/logs", get(job_logs))
        .route("/jobs/{id}/artifacts", get(job_artifacts))
        // Uploads are streamed to disk and capped by `max_upload_mb` instead.
        .layer(DefaultBodyLimit::disable())
        .layer(middleware::from_fn_with_state(state.clone(), require_token));

    Router::new()
        .route("/healthz", get(|| async { Json(json!({ "ok": true })) }))
        .nest(API_PREFIX, api)
        .with_state(state)
}

/// Compare without leaking, through timing, how much of the token matched.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

async fn require_token(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let expected = state.config.token.as_bytes();
    let presented = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "));
    match presented {
        // An empty configured token must never authenticate anyone.
        Some(token) if !expected.is_empty() && constant_time_eq(token.as_bytes(), expected) => {
            next.run(request).await
        }
        _ => ApiError(
            StatusCode::UNAUTHORIZED,
            "Missing or invalid access token.".into(),
        )
        .into_response(),
    }
}

async fn agent_info(State(state): State<AppState>) -> Json<AgentInfo> {
    let (running_jobs, queued_jobs) = state.engine.counts();
    Json(AgentInfo {
        name: state.config.name.clone(),
        version: env!("CARGO_PKG_VERSION").into(),
        os: std::env::consts::OS.into(),
        arch: std::env::consts::ARCH.into(),
        runtime: state.trainer.state(),
        gpu: state.trainer.gpu().await,
        running_jobs,
        queued_jobs,
        max_concurrent: state.engine.max_concurrent(),
    })
}

async fn list_jobs(State(state): State<AppState>) -> Json<Vec<JobView>> {
    let engine = &state.engine;
    Json(engine.list().iter().map(|job| engine.view(job)).collect())
}

async fn create_job(
    State(state): State<AppState>,
    Json(request): Json<CreateJobRequest>,
) -> ApiResult<(StatusCode, Json<JobView>)> {
    let job = state.engine.create(request)?;
    Ok((StatusCode::CREATED, Json(state.engine.view(&job))))
}

async fn get_job(
    State(state): State<AppState>,
    UrlPath(id): UrlPath<String>,
) -> ApiResult<Json<JobView>> {
    Ok(Json(state.engine.view(&state.engine.get(&id)?)))
}

async fn delete_job(
    State(state): State<AppState>,
    UrlPath(id): UrlPath<String>,
) -> ApiResult<StatusCode> {
    state.engine.delete(&id)?;
    Ok(StatusCode::NO_CONTENT)
}

/// Stream a request body to `dest`, refusing more than `limit` bytes.
async fn receive(body: Body, dest: &Path, limit: u64) -> ApiResult<u64> {
    if let Some(parent) = dest.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    let mut file = tokio::fs::File::create(dest).await?;
    let mut stream = body.into_data_stream();
    let mut total: u64 = 0;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| ApiError::bad_request(format!("Upload interrupted: {e}")))?;
        total += chunk.len() as u64;
        if total > limit {
            drop(file);
            let _ = tokio::fs::remove_file(dest).await;
            return Err(ApiError(
                StatusCode::PAYLOAD_TOO_LARGE,
                format!(
                    "Upload exceeds the agent's {} MB limit.",
                    limit / (1024 * 1024)
                ),
            ));
        }
        file.write_all(&chunk).await?;
    }
    file.flush().await?;
    Ok(total)
}

#[derive(Deserialize)]
struct DatasetQuery {
    /// Dataset file inside the archive the trainer opens. Defaults to `data.yaml`.
    entry: Option<String>,
}

fn is_plain_relative(path: &str) -> bool {
    use std::path::Component;
    !path.is_empty()
        && Path::new(path)
            .components()
            .all(|part| matches!(part, Component::Normal(_)))
}

async fn upload_dataset(
    State(state): State<AppState>,
    UrlPath(id): UrlPath<String>,
    Query(query): Query<DatasetQuery>,
    body: Body,
) -> ApiResult<Json<JobView>> {
    let entry = query.entry.unwrap_or_else(|| "data.yaml".into());
    if !is_plain_relative(&entry) {
        return Err(ApiError::bad_request(
            "`entry` must be a relative path inside the dataset.",
        ));
    }
    state.engine.ensure_accepts_uploads(&id)?;
    let paths = state.engine.paths(&id);
    let archive_path = paths.dir.join("dataset.tar");
    receive(body, &archive_path, state.config.max_upload_bytes()).await?;

    let dataset_dir = paths.dataset_dir.clone();
    let entry_for_task = entry.clone();
    let unpacked = tokio::task::spawn_blocking(move || -> Result<(), String> {
        // A re-upload replaces the dataset rather than merging into it.
        if dataset_dir.exists() {
            std::fs::remove_dir_all(&dataset_dir).map_err(|e| e.to_string())?;
        }
        let result = archive::unpack(&archive_path, &dataset_dir).map_err(|e| e.to_string());
        let _ = std::fs::remove_file(&archive_path);
        result?;
        let yaml = dataset_dir.join(&entry_for_task);
        if !yaml.is_file() {
            return Err(format!("The dataset has no `{entry_for_task}`."));
        }
        rebase_dataset_yaml(&yaml, &dataset_dir).map_err(|e| e.to_string())
    })
    .await
    .map_err(ApiError::internal)?;
    unpacked.map_err(ApiError::bad_request)?;

    let job = state.engine.set_dataset(&id, entry)?;
    Ok(Json(state.engine.view(&job)))
}

async fn upload_weights(
    State(state): State<AppState>,
    UrlPath(id): UrlPath<String>,
    body: Body,
) -> ApiResult<Json<JobView>> {
    state.engine.ensure_accepts_uploads(&id)?;
    let paths = state.engine.paths(&id);
    let received = receive(body, &paths.base_weights, state.config.max_upload_bytes()).await?;
    if received == 0 {
        let _ = tokio::fs::remove_file(&paths.base_weights).await;
        return Err(ApiError::bad_request("The weights file is empty."));
    }
    let job = state.engine.set_base_weights(&id)?;
    Ok(Json(state.engine.view(&job)))
}

async fn start_job(
    State(state): State<AppState>,
    UrlPath(id): UrlPath<String>,
) -> ApiResult<Json<JobView>> {
    let job = state.engine.queue(&id)?;
    Ok(Json(state.engine.view(&job)))
}

async fn stop_job(
    State(state): State<AppState>,
    UrlPath(id): UrlPath<String>,
) -> ApiResult<Json<JobView>> {
    let job = state.engine.stop(&id).await?;
    Ok(Json(state.engine.view(&job)))
}

#[derive(Deserialize)]
struct LogQuery {
    #[serde(default)]
    offset: u64,
}

/// Read whole lines from `log` starting at `offset`. A trailing partial line is
/// left for the next poll unless the job is finished (nothing more will come).
async fn read_log(log: &Path, offset: u64, finished: bool) -> std::io::Result<LogChunk> {
    let mut file = match tokio::fs::File::open(log).await {
        Ok(file) => file,
        // No log yet (queued, or the trainer hasn't written): an empty chunk.
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Ok(LogChunk {
                lines: Vec::new(),
                next_offset: offset,
                eof: finished,
            })
        }
        Err(error) => return Err(error),
    };
    let length = file.metadata().await?.len();
    let start = offset.min(length);
    file.seek(std::io::SeekFrom::Start(start)).await?;
    let mut buffer = Vec::new();
    (&mut file)
        .take(LOG_CHUNK_BYTES)
        .read_to_end(&mut buffer)
        .await?;

    let reached_end = start + buffer.len() as u64 >= length;
    let complete = match buffer.iter().rposition(|byte| *byte == b'\n') {
        Some(newline) => newline + 1,
        None if finished && reached_end => buffer.len(),
        None => 0,
    };
    let consumed = if finished && reached_end {
        buffer.len()
    } else {
        complete
    };
    let lines = String::from_utf8_lossy(&buffer[..consumed])
        .lines()
        .map(str::to_owned)
        .collect();
    let next_offset = start + consumed as u64;
    Ok(LogChunk {
        lines,
        next_offset,
        eof: finished && next_offset >= length,
    })
}

async fn job_logs(
    State(state): State<AppState>,
    UrlPath(id): UrlPath<String>,
    Query(query): Query<LogQuery>,
) -> ApiResult<Json<LogChunk>> {
    let job = state.engine.get(&id)?;
    let finished = !status::is_in_flight(&job.status);
    let chunk = read_log(&state.engine.paths(&id).log, query.offset, finished).await?;
    Ok(Json(chunk))
}

async fn job_artifacts(
    State(state): State<AppState>,
    UrlPath(id): UrlPath<String>,
) -> ApiResult<Response> {
    state.engine.get(&id)?;
    let paths = state.engine.paths(&id);
    let archive_path = paths.dir.join("artifacts.tar");
    let output_dir = paths.output_dir.clone();
    let target = archive_path.clone();
    let written = tokio::task::spawn_blocking(move || {
        archive::pack_files(&output_dir, ARTIFACT_FILES, &target)
    })
    .await
    .map_err(ApiError::internal)?
    .map_err(ApiError::internal)?;
    if written == 0 {
        let _ = tokio::fs::remove_file(&archive_path).await;
        return Err(ApiError(
            StatusCode::CONFLICT,
            "This job has produced no artifacts yet.".into(),
        ));
    }

    let file = tokio::fs::File::open(&archive_path).await?;
    let length = file.metadata().await?.len();
    Ok((
        [
            (header::CONTENT_TYPE, "application/x-tar".to_string()),
            (header::CONTENT_LENGTH, length.to_string()),
        ],
        Body::from_stream(ReaderStream::new(file)),
    )
        .into_response())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::jobs::tests::{request, FakeTrainer};
    use axum::http::{Method, Request as HttpRequest};
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    struct Harness {
        app: Router,
        engine: Arc<Engine>,
        trainer: Arc<FakeTrainer>,
        _dir: tempfile::TempDir,
    }

    fn harness() -> Harness {
        let dir = tempfile::tempdir().unwrap();
        let mut config = AgentConfig::new("test-box".into(), dir.path().into(), "python3".into());
        config.token = "secret".into();
        config.max_upload_mb = 1;
        let trainer = Arc::new(FakeTrainer::default());
        let engine = Arc::new(Engine::open(config.jobs_dir(), trainer.clone(), 1).unwrap());
        let app = router(AppState {
            engine: engine.clone(),
            trainer: trainer.clone(),
            config: Arc::new(config),
        });
        Harness {
            app,
            engine,
            trainer,
            _dir: dir,
        }
    }

    async fn call(
        harness: &Harness,
        method: Method,
        path: &str,
        token: Option<&str>,
        body: Body,
        json_body: bool,
    ) -> (StatusCode, Vec<u8>) {
        let mut builder = HttpRequest::builder().method(method).uri(path);
        if let Some(token) = token {
            builder = builder.header(header::AUTHORIZATION, format!("Bearer {token}"));
        }
        if json_body {
            builder = builder.header(header::CONTENT_TYPE, "application/json");
        }
        let response = harness
            .app
            .clone()
            .oneshot(builder.body(body).unwrap())
            .await
            .unwrap();
        let status = response.status();
        let bytes = response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .to_vec();
        (status, bytes)
    }

    async fn authed(
        harness: &Harness,
        method: Method,
        path: &str,
        body: Body,
    ) -> (StatusCode, Vec<u8>) {
        call(harness, method, path, Some("secret"), body, false).await
    }

    async fn create(harness: &Harness, id: &str) {
        let body = serde_json::to_vec(&request(id)).unwrap();
        let (status, _) = call(
            harness,
            Method::POST,
            "/v1/jobs",
            Some("secret"),
            Body::from(body),
            true,
        )
        .await;
        assert_eq!(status, StatusCode::CREATED);
    }

    fn dataset_tar() -> Vec<u8> {
        let src = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(src.path().join("images/train")).unwrap();
        std::fs::write(
            src.path().join("data.yaml"),
            "path: /elsewhere\ntrain: images/train\n",
        )
        .unwrap();
        std::fs::write(src.path().join("images/train/a.jpg"), b"jpeg").unwrap();
        // Its own directory: tests run in parallel and must not share the file.
        let work = tempfile::tempdir().unwrap();
        let out = work.path().join("dataset.tar");
        archive::pack_dir(src.path(), &out).unwrap();
        std::fs::read(&out).unwrap()
    }

    #[tokio::test]
    async fn rejects_requests_without_the_token() {
        let harness = harness();

        for token in [None, Some("wrong"), Some("")] {
            let (status, _) = call(
                &harness,
                Method::GET,
                "/v1/agent",
                token,
                Body::empty(),
                false,
            )
            .await;
            assert_eq!(status, StatusCode::UNAUTHORIZED, "{token:?}");
        }
        let (open, _) = call(
            &harness,
            Method::GET,
            "/healthz",
            None,
            Body::empty(),
            false,
        )
        .await;
        assert_eq!(open, StatusCode::OK);
    }

    #[tokio::test]
    async fn reports_who_it_is() {
        let harness = harness();

        let (status, body) = authed(&harness, Method::GET, "/v1/agent", Body::empty()).await;
        let info: AgentInfo = serde_json::from_slice(&body).unwrap();

        assert_eq!(status, StatusCode::OK);
        assert_eq!(
            (info.name.as_str(), info.gpu.as_deref()),
            ("test-box", Some("Fake GPU"))
        );
        assert_eq!(info.max_concurrent, 1);
    }

    #[tokio::test]
    async fn runs_a_job_from_upload_to_artifacts() {
        let harness = harness();
        create(&harness, "job1").await;

        // Dataset upload: unpacked, and data.yaml rebased onto the agent's disk.
        let (status, _) = authed(
            &harness,
            Method::PUT,
            "/v1/jobs/job1/dataset?entry=data.yaml",
            Body::from(dataset_tar()),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        let paths = harness.engine.paths("job1");
        let yaml = std::fs::read_to_string(paths.dataset_dir.join("data.yaml")).unwrap();
        assert!(yaml.starts_with(&format!("path: '{}'", paths.dataset_dir.display())));
        assert!(paths.dataset_dir.join("images/train/a.jpg").exists());

        let (status, _) = authed(
            &harness,
            Method::PUT,
            "/v1/jobs/job1/weights",
            Body::from("weights"),
        )
        .await;
        assert_eq!(status, StatusCode::OK);

        let (status, body) =
            authed(&harness, Method::POST, "/v1/jobs/job1/start", Body::empty()).await;
        let view: JobView = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            (status, view.status.as_str()),
            (StatusCode::OK, status::QUEUED)
        );
        assert!(view.has_dataset && view.has_base_weights && !view.has_weights);

        // The scheduler picks it up; the trainer writes output and finishes.
        harness.engine.tick().await;
        std::fs::create_dir_all(paths.output_dir.join("weights")).unwrap();
        std::fs::write(paths.output_dir.join("weights/best.pt"), b"trained").unwrap();
        std::fs::write(paths.output_dir.join("results.csv"), "epoch\n1\n").unwrap();
        std::fs::write(&paths.log, "epoch 1\nepoch 2\npartial").unwrap();
        harness.trainer.report("job1", status::COMPLETED, 1.0);
        harness.engine.tick().await;

        let (_, body) = authed(&harness, Method::GET, "/v1/jobs/job1", Body::empty()).await;
        let view: JobView = serde_json::from_slice(&body).unwrap();
        assert_eq!(view.status, status::COMPLETED);
        assert!(view.has_weights);

        let (_, body) = authed(
            &harness,
            Method::GET,
            "/v1/jobs/job1/logs?offset=0",
            Body::empty(),
        )
        .await;
        let chunk: LogChunk = serde_json::from_slice(&body).unwrap();
        assert_eq!(chunk.lines, vec!["epoch 1", "epoch 2", "partial"]);
        assert!(chunk.eof);

        let (status, tar) = authed(
            &harness,
            Method::GET,
            "/v1/jobs/job1/artifacts",
            Body::empty(),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        let work = tempfile::tempdir().unwrap();
        std::fs::write(work.path().join("a.tar"), tar).unwrap();
        archive::unpack(&work.path().join("a.tar"), &work.path().join("out")).unwrap();
        assert_eq!(
            std::fs::read(work.path().join("out/weights/best.pt")).unwrap(),
            b"trained"
        );
        assert!(work.path().join("out/results.csv").exists());
    }

    #[tokio::test]
    async fn holds_back_a_partial_log_line_while_the_job_is_running() {
        let dir = tempfile::tempdir().unwrap();
        let log = dir.path().join("job.log");
        std::fs::write(&log, "one\ntwo\nthr").unwrap();

        let first = read_log(&log, 0, false).await.unwrap();
        assert_eq!(
            (first.lines.clone(), first.next_offset, first.eof),
            (vec!["one".to_string(), "two".into()], 8, false)
        );

        std::fs::write(&log, "one\ntwo\nthree\n").unwrap();
        let second = read_log(&log, first.next_offset, true).await.unwrap();
        assert_eq!(
            (second.lines, second.eof),
            (vec!["three".to_string()], true)
        );
    }

    #[tokio::test]
    async fn refuses_oversized_uploads_and_bad_archives() {
        let harness = harness();
        create(&harness, "job1").await;

        let too_big = vec![0u8; 2 * 1024 * 1024];
        let (status, _) = authed(
            &harness,
            Method::PUT,
            "/v1/jobs/job1/weights",
            Body::from(too_big),
        )
        .await;
        assert_eq!(status, StatusCode::PAYLOAD_TOO_LARGE);
        assert!(!harness.engine.paths("job1").base_weights.exists());

        let (status, _) = authed(
            &harness,
            Method::PUT,
            "/v1/jobs/job1/dataset",
            Body::from("not a tar"),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);

        let (status, _) = authed(
            &harness,
            Method::PUT,
            "/v1/jobs/job1/dataset?entry=../../etc/passwd",
            Body::from(dataset_tar()),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn maps_engine_errors_to_http_statuses() {
        let harness = harness();
        create(&harness, "job1").await;

        let (missing, _) = authed(&harness, Method::GET, "/v1/jobs/nope", Body::empty()).await;
        let (no_dataset, body) =
            authed(&harness, Method::POST, "/v1/jobs/job1/start", Body::empty()).await;
        let (no_artifacts, _) = authed(
            &harness,
            Method::GET,
            "/v1/jobs/job1/artifacts",
            Body::empty(),
        )
        .await;
        let duplicate = serde_json::to_vec(&request("job1")).unwrap();
        let (conflict, _) = call(
            &harness,
            Method::POST,
            "/v1/jobs",
            Some("secret"),
            Body::from(duplicate),
            true,
        )
        .await;

        assert_eq!(missing, StatusCode::NOT_FOUND);
        assert_eq!(no_dataset, StatusCode::CONFLICT);
        assert!(String::from_utf8_lossy(&body).contains("Upload the dataset"));
        assert_eq!(no_artifacts, StatusCode::CONFLICT);
        assert_eq!(conflict, StatusCode::CONFLICT);
    }
}
