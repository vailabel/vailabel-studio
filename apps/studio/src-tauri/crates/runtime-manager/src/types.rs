use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Runtime lifecycle state + events (emitted to the frontend → camelCase)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RuntimeState {
    Stopped,
    Starting,
    Healthy,
    Unhealthy,
    Restarting,
    Crashed,
}

impl Default for RuntimeState {
    fn default() -> Self {
        RuntimeState::Stopped
    }
}

/// Resource usage of the runtime process (not the whole machine).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeMetrics {
    pub cpu: f32,
    pub ram_mb: u64,
    pub gpu_util: Option<f32>,
    pub vram_used_mb: Option<u64>,
    pub vram_total_mb: Option<u64>,
}

/// Snapshot returned by the `runtime_status` command.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub state: RuntimeState,
    pub port: Option<u16>,
    pub pid: Option<u32>,
    pub version: Option<String>,
    pub uptime_s: Option<f64>,
    pub last_error: Option<String>,
    pub restart_count: u32,
    pub metrics: Option<RuntimeMetrics>,
}

/// Payload for the `runtime://status` event.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusEvent {
    pub state: RuntimeState,
    pub last_error: Option<String>,
    pub restarted_from_crash: bool,
    pub give_up: bool,
    pub port: Option<u16>,
    pub pid: Option<u32>,
}

/// Emitted by the monitor loop; the glue maps `channel()` + `payload()` onto
/// `app.emit(...)`.
pub enum RuntimeEvent {
    Status(StatusEvent),
    Metrics(RuntimeMetrics),
}

impl RuntimeEvent {
    pub fn channel(&self) -> &'static str {
        match self {
            RuntimeEvent::Status(_) => "runtime://status",
            RuntimeEvent::Metrics(_) => "runtime://metrics",
        }
    }

    pub fn payload(&self) -> serde_json::Value {
        match self {
            RuntimeEvent::Status(s) => serde_json::to_value(s).unwrap_or_default(),
            RuntimeEvent::Metrics(m) => serde_json::to_value(m).unwrap_or_default(),
        }
    }
}

// ---------------------------------------------------------------------------
// HTTP wire types (talk to FastAPI → snake_case, matches Python defaults)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub uptime_s: f64,
    #[serde(default)]
    pub gpu_available: bool,
    #[serde(default)]
    pub loaded_models: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfoResponse {
    #[serde(default)]
    pub python_version: String,
    #[serde(default)]
    pub torch_version: String,
    #[serde(default)]
    pub platform: String,
    #[serde(default)]
    pub cpu_count: u32,
    #[serde(default, flatten)]
    pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuInfoResponse {
    #[serde(default)]
    pub available: bool,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub util: Option<f32>,
    #[serde(default)]
    pub vram_used_mb: Option<u64>,
    #[serde(default)]
    pub vram_total_mb: Option<u64>,
    #[serde(default)]
    pub cuda_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectRequest {
    pub model_path: String,
    pub image_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conf: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub iou: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectResponse {
    #[serde(default)]
    pub detections: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentRequest {
    pub model_path: String,
    pub image_path: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub points: Vec<[f32; 2]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub box_xyxy: Option<[f32; 4]>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentResponse {
    #[serde(default)]
    pub masks: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptionRequest {
    pub model_path: String,
    pub image_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptionResponse {
    #[serde(default)]
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrRequest {
    pub model_path: String,
    pub image_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrResponse {
    #[serde(default)]
    pub lines: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingStartRequest {
    pub job_id: String,
    pub project_id: String,
    pub model_family: String,
    pub dataset_path: String,
    #[serde(default)]
    pub config: serde_json::Value,
    /// Where the runtime should write per-job log lines.
    pub log_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingJobRef {
    pub job_id: String,
    #[serde(default)]
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobIdRequest {
    pub job_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ack {
    #[serde(default)]
    pub ok: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingJobStatus {
    pub job_id: String,
    pub status: String,
    #[serde(default)]
    pub progress: f32,
    #[serde(default)]
    pub metrics: serde_json::Value,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingLogChunk {
    #[serde(default)]
    pub lines: Vec<String>,
    /// Byte offset to pass on the next poll.
    #[serde(default)]
    pub next_offset: u64,
    #[serde(default)]
    pub eof: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportRequest {
    pub model_path: String,
    pub format: String,
    pub output_path: String,
    #[serde(default)]
    pub opts: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportResult {
    #[serde(default)]
    pub ok: bool,
    #[serde(default)]
    pub output_path: String,
    #[serde(default)]
    pub error: Option<String>,
}
