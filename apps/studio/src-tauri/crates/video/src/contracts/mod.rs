//! Inbound request payloads for the video commands.

use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportVideoRequest {
    pub project_id: String,
    pub name: String,
    pub path: String,
    /// Fallbacks used only if ffprobe is unavailable (webview `<video>` probe).
    #[serde(default)]
    pub fps: f64,
    #[serde(default)]
    pub duration: f64,
    #[serde(default)]
    pub width: i64,
    #[serde(default)]
    pub height: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestRequest {
    pub video_id: String,
    /// Filmstrip sampling rate (frames per source second). Default 2.
    #[serde(default)]
    pub sample_fps: Option<f64>,
    /// FFmpeg scene score threshold [0,1]. Default 0.4.
    #[serde(default)]
    pub scene_threshold: Option<f64>,
    /// Use CUDA hardware decode (falls back to software automatically).
    #[serde(default)]
    pub use_cuda: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIdPayload {
    pub project_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoIdPayload {
    pub video_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityIdPayload {
    pub id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobIdPayload {
    pub job_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportTracksRequest {
    pub video_id: String,
    #[serde(default)]
    pub start_frame: Option<i64>,
    #[serde(default)]
    pub end_frame: Option<i64>,
    #[serde(default)]
    pub step: Option<i64>,
}
