//! Data model for Phase 5 Video Annotation.
//!
//! The frontend mirror of these types lives in `src/types/video.ts`; field
//! names are camelCase to match `#[serde(rename_all = "camelCase")]` so the
//! same JSON crosses the IPC boundary unchanged.
//!
//! ## Processing model
//! All heavy video work (decode, frame extraction, scene detection) runs in the
//! Rust backend by shelling out to **FFmpeg** with CUDA hardware decode (see
//! [`super::ffmpeg`]). The webview only *plays* the clip via a `<video>` element
//! and renders annotation overlays.
//!
//! ## Tracking model (CVAT-style)
//! A [`Track`] stores only **keyframes**; every other frame's shape is
//! interpolated on demand (see [`super::interpolation`]). Tiny storage, cheap
//! edits.

use serde::{Deserialize, Serialize};

use crate::now_iso;

/// A 2D point in **image space** (same convention as image annotations).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

// ── Scene detection ───────────────────────────────────────────────────────────

/// A detected scene boundary (the first frame of a new shot).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SceneCut {
    pub frame: i64,
    pub time: f64,
    /// FFmpeg scene score [0,1]; 1.0 for the implicit opening cut.
    pub score: f64,
}

// ── Extracted frames ───────────────────────────────────────────────────────────

/// A frame FFmpeg wrote to the on-disk cache, referenced for the timeline
/// filmstrip and rendered in the webview via the asset protocol.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrameThumb {
    /// Frame index in the *source* video (time × source fps).
    pub frame: i64,
    pub time: f64,
    /// Absolute path to the extracted JPEG.
    pub path: String,
}

// ── Video ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Video {
    pub id: String,
    pub project_id: String,
    pub name: String,
    /// Absolute on-disk path to the source clip.
    pub path: String,
    pub fps: f64,
    /// Duration in seconds.
    pub duration: f64,
    pub width: i64,
    pub height: i64,
    pub frame_count: i64,
    /// Rate the filmstrip frames were sampled at (frames per source second).
    #[serde(default)]
    pub sample_fps: f64,
    /// Directory FFmpeg wrote extracted frames into.
    #[serde(default)]
    pub frames_dir: String,
    #[serde(default)]
    pub frames: Vec<FrameThumb>,
    #[serde(default)]
    pub scene_cuts: Vec<SceneCut>,
    /// "imported" | "processing" | "ready" | "failed".
    #[serde(default = "default_status")]
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

fn default_status() -> String {
    "imported".to_string()
}

// ── Tracks & keyframes ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackKeyframe {
    pub frame: i64,
    /// Box: `[topLeft, bottomRight]`. Polygon: vertices. Image-space coords.
    #[serde(default)]
    pub shape: Vec<Point>,
    /// Object not present on this frame (interpolation stops here).
    #[serde(default)]
    pub outside: bool,
    /// Present but occluded (cosmetic; still interpolated).
    #[serde(default)]
    pub occluded: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    #[serde(default)]
    pub id: String,
    pub project_id: String,
    pub video_id: String,
    #[serde(default)]
    pub label_id: Option<String>,
    #[serde(default)]
    pub label_name: String,
    #[serde(default = "default_color")]
    pub color: String,
    /// Shape kind: "box" | "polygon". Renamed from `type` (a Rust keyword).
    #[serde(rename = "type", default = "default_kind")]
    pub kind: String,
    #[serde(default)]
    pub keyframes: Vec<TrackKeyframe>,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

fn default_color() -> String {
    "#2563eb".to_string()
}
fn default_kind() -> String {
    "box".to_string()
}

/// A track shape resolved at one concrete frame, flattened for export.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterializedShape {
    pub track_id: String,
    pub label_id: Option<String>,
    pub label_name: String,
    pub color: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub frame: i64,
    pub shape: Vec<Point>,
    pub keyframe: bool,
    pub interpolated: bool,
}

// ── Ingest jobs ────────────────────────────────────────────────────────────────

/// Progress handle for a background ingest (extract + scene detect), streamed
/// to the UI over the `video://progress` event.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoJob {
    pub job_id: String,
    pub video_id: String,
    pub project_id: String,
    pub status: String,
    pub stage: String,
    pub progress: f64,
    pub error: Option<String>,
    pub started_at: String,
    pub updated_at: String,
}

impl VideoJob {
    pub fn new(job_id: String, video_id: String, project_id: String) -> Self {
        let now = now_iso();
        Self {
            job_id,
            video_id,
            project_id,
            status: "queued".into(),
            stage: "Queued".into(),
            progress: 0.0,
            error: None,
            started_at: now.clone(),
            updated_at: now,
        }
    }
}

/// Reported FFmpeg/CUDA availability so the UI can guide the user.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FfmpegInfo {
    pub ffmpeg: bool,
    pub ffprobe: bool,
    pub cuda: bool,
    pub version: Option<String>,
    pub message: String,
}

// ── Request payloads ───────────────────────────────────────────────────────────

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

/// Internal result of an ffprobe metadata read.
pub struct ProbeResult {
    pub duration: f64,
    pub fps: f64,
    pub width: i64,
    pub height: i64,
    pub frame_count: i64,
}
